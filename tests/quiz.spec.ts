import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/worker";
import type { WorkerEnv } from "../src/types/worker";
import { MockD1 } from "./helpers/mock-d1";

function getCookies(res: Response): string[] {
  // Node/undici exposes getSetCookie for multiple cookies
  // @ts-expect-error - not in lib.dom yet
  if (typeof res.headers.getSetCookie === "function") {
    // @ts-expect-error
    return res.headers.getSetCookie();
  }
  const header = res.headers.get("set-cookie");
  if (!header) return [];
  return header.split(/,(?=[^;]+=[^;]+)/);
}

describe("quiz generation route", () => {
  const AUTH_SECRET = "test-secret";
  let env: WorkerEnv;
  let db: MockD1;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    db = new MockD1();
    env = {
      AUTH_SECRET,
      DB: db as unknown as D1Database,
      JWT_ISSUER: "test-issuer",
      QUIZ_MODE: "mock"
    } as unknown as WorkerEnv;
    originalFetch = global.fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("bootstraps a session and returns mock quiz payload", async () => {
    const res = await app.fetch(new Request("https://example.com/api/quiz/generate", { method: "POST" }), env);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.sessionId).toBeTruthy();
    expect(body.quizId).toBeTruthy();
    expect(body.source).toBe("mock");
    expect(body.questions.length).toBeGreaterThanOrEqual(5);
    expect(body.questions.length).toBeLessThanOrEqual(10);

    const cookies = getCookies(res);
    expect(cookies.some((cookie) => cookie.startsWith("cq_session="))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith("cq_access="))).toBe(true);
  });

  it("rejects revoked sessions without issuing a quiz", async () => {
    const sessionId = "revoked-session";
    db.sessions.set(sessionId, {
      id: sessionId,
      user_id: null,
      created_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      revoked: 1
    });

    const res = await app.fetch(
      new Request("https://example.com/api/quiz/generate", {
        method: "POST",
        headers: { cookie: `cq_session=${sessionId}` }
      }),
      env
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Invalid session" });
  });

  it("normalizes quizzes from the live API", async () => {
    env.QUIZ_MODE = "live";
    env.QUIZ_LEAGUE_ID = "league-1";
    env.QUIZ_LENGTH = "6";

    const liveResponse = {
      questions: Array.from({ length: 6 }).map((_, index) => ({
        question: `Live question ${index + 1}`,
        answers: ["Correct", "Wrong 1", "Wrong 2", "Wrong 3"]
      })),
      fixture: { id: "fx-1" }
    };

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(liveResponse), { status: 200, headers: { "Content-Type": "application/json" } })
    ) as unknown as typeof fetch;

    const res = await app.fetch(new Request("https://example.com/api/quiz/generate", { method: "POST" }), env);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.source).toBe("live");
    expect(body.metadata.fixture.id).toBe("fx-1");
    expect(body.questions.length).toBe(6);
    expect(body.questions[0].options.some((option: { isCorrect: boolean }) => option.isCorrect)).toBe(true);
  });

  it("returns an error when the upstream quiz call fails", async () => {
    env.QUIZ_MODE = "live";
    env.QUIZ_LEAGUE_ID = "league-1";

    global.fetch = vi.fn().mockResolvedValue(new Response("upstream error", { status: 500 })) as unknown as typeof fetch;

    const res = await app.fetch(new Request("https://example.com/api/quiz/generate", { method: "POST" }), env);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: "Failed to generate quiz" });
  });
});
