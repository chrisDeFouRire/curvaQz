import type { Context, Handler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { SignJWT } from "jose";
import { createSession, getSession, touchSession } from "../lib/db";
import type { SessionRow } from "../lib/db";
import type { WorkerEnv } from "../types/worker";

const SESSION_COOKIE = "cq_session";
const ACCESS_TOKEN_COOKIE = "cq_access";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60; // 1 hour
const DEFAULT_ISSUER = "curvaqz";

type SessionContext = Context<{ Bindings: WorkerEnv }>;
type SessionIssue = {
  session: SessionRow;
  token: string;
  expiresAt: number;
};

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncodeBytes(bytes);
}

function readSessionId(c: SessionContext): string | null {
  return getCookie(c, SESSION_COOKIE) ?? null;
}

function applyAuthCookies(c: SessionContext, sessionId: string, token: string): void {
  const isSecure = c.req.url.startsWith("https://");

  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });

  setCookie(c, ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS
  });
}

async function issueToken(
  env: WorkerEnv,
  sessionId: string,
  userId: string | null
): Promise<{ token: string; exp: number }> {
  if (!env.AUTH_SECRET) {
    throw new Error("Auth secret is not configured");
  }

  const secret = new TextEncoder().encode(env.AUTH_SECRET);
  const issuedAt = Math.floor(Date.now() / 1000);
  const exp = issuedAt + ACCESS_TOKEN_MAX_AGE_SECONDS;

  const signer = new SignJWT({
    sid: sessionId
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(exp)
    .setIssuer(env.JWT_ISSUER ?? DEFAULT_ISSUER);

  if (env.JWT_AUDIENCE) {
    signer.setAudience(env.JWT_AUDIENCE);
  }

  if (userId) {
    signer.setSubject(userId);
  }

  const token = await signer.sign(secret);

  return { token, exp };
}

type EnsureSessionOptions = {
  createIfMissing: boolean;
  replaceRevoked: boolean;
};

export async function ensureSession(
  c: SessionContext,
  options: EnsureSessionOptions
): Promise<{ type: "ok"; value: SessionIssue } | { type: "error"; response: Response }> {
  const existingSessionId = readSessionId(c);
  const env = c.env;

  let session = existingSessionId ? await getSession(env.DB, existingSessionId) : null;

  if (session && session.revoked) {
    if (!options.replaceRevoked) {
      return { type: "error", response: c.json({ error: "Invalid session" }, 401) };
    }
    session = null;
  }

  if (!session) {
    if (!options.createIfMissing && existingSessionId) {
      return { type: "error", response: c.json({ error: "Invalid session" }, 401) };
    }

    if (!options.createIfMissing) {
      return { type: "error", response: c.json({ error: "Missing session" }, 400) };
    }

    const sessionId = generateSessionId();
    session = await createSession(env.DB, sessionId);
  } else {
    await touchSession(env.DB, session.id);
  }

  let issued;
  try {
    issued = await issueToken(env, session.id, session.user_id);
  } catch (error) {
    return {
      type: "error",
      response: c.json(
        { error: "Failed to issue token", detail: error instanceof Error ? error.message : String(error) },
        500
      )
    };
  }

  applyAuthCookies(c, session.id, issued.token);

  return {
    type: "ok",
    value: {
      session,
      token: issued.token,
      expiresAt: issued.exp * 1000
    }
  };
}

export const handleSessionBootstrap: Handler<{ Bindings: WorkerEnv }> = async (c) => {
  const result = await ensureSession(c, { createIfMissing: true, replaceRevoked: true });
  if (result.type === "error") return result.response;

  return c.json({
    sessionId: result.value.session.id,
    userId: result.value.session.user_id,
    token: result.value.token,
    expiresAt: result.value.expiresAt
  });
};

export const handleSessionRefresh: Handler<{ Bindings: WorkerEnv }> = async (c) => {
  const result = await ensureSession(c, { createIfMissing: false, replaceRevoked: false });
  if (result.type === "error") return result.response;

  return c.json({
    sessionId: result.value.session.id,
    userId: result.value.session.user_id,
    token: result.value.token,
    expiresAt: result.value.expiresAt
  });
};
