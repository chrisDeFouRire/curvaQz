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
      QUIZ_MODE: "mock",
      QUIZ_LENGTH: "10"
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
    // Mock quiz data only has 5 questions, so we get 5 even though QUIZ_LENGTH is 10
    expect(body.questions.length).toBe(5);

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
    env.QUIZ_API_AUTH = "test-auth";
    env.QUIZ_API_BASE = "https://clashui.inia.fr/api/quiz/";
    env.QUIZ_LENGTH = "6";

    // Mock response matching real API format: questions in numeric keys "0", "1", etc.
    const liveResponse = {
      "0": {
        question: "Live question 1",
        answers: [
          { type: "OK", txt: "Correct" },
          { type: "BAD", txt: "Wrong 1" },
          { type: "BAD", txt: "Wrong 2" },
          { type: "BAD", txt: "Wrong 3" }
        ]
      },
      "1": {
        question: "Live question 2",
        answers: [
          { type: "OK", txt: "Correct" },
          { type: "BAD", txt: "Wrong 1" },
          { type: "BAD", txt: "Wrong 2" },
          { type: "BAD", txt: "Wrong 3" }
        ]
      },
      "2": {
        question: "Live question 3",
        answers: [
          { type: "OK", txt: "Correct" },
          { type: "BAD", txt: "Wrong 1" },
          { type: "BAD", txt: "Wrong 2" },
          { type: "BAD", txt: "Wrong 3" }
        ]
      },
      "3": {
        question: "Live question 4",
        answers: [
          { type: "OK", txt: "Correct" },
          { type: "BAD", txt: "Wrong 1" },
          { type: "BAD", txt: "Wrong 2" },
          { type: "BAD", txt: "Wrong 3" }
        ]
      },
      "4": {
        question: "Live question 5",
        answers: [
          { type: "OK", txt: "Correct" },
          { type: "BAD", txt: "Wrong 1" },
          { type: "BAD", txt: "Wrong 2" },
          { type: "BAD", txt: "Wrong 3" }
        ]
      },
      "5": {
        question: "Live question 6",
        answers: [
          { type: "OK", txt: "Correct" },
          { type: "BAD", txt: "Wrong 1" },
          { type: "BAD", txt: "Wrong 2" },
          { type: "BAD", txt: "Wrong 3" }
        ]
      },
      fixture: {
        fixture: { id: "fx-1", date: "2025-11-23T19:45:00+00:00" },
        league: { id: 61, name: "Premier League" }
      }
    };

    // Mock getLeagues first, then getQuizByLatestFixture
    global.fetch = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([
          { id: 61, name: "Premier League" }
        ]), { status: 200, headers: { "Content-Type": "application/json" } })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(liveResponse), { status: 200, headers: { "Content-Type": "application/json" } })
      ) as unknown as typeof fetch;

    const res = await app.fetch(new Request("https://example.com/api/quiz/generate", { method: "POST" }), env);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.source).toBe("live");
    expect(body.metadata.fixture.fixture.id).toBe("fx-1");
    expect(body.metadata.league.id).toBe(61);
    expect(body.metadata.league.name).toBe("Premier League");
    expect(body.questions.length).toBe(6);
    expect(body.questions[0].options.some((option: { isCorrect: boolean }) => option.isCorrect)).toBe(true);
  });

  it("falls back to mock when live API fails", async () => {
    env.QUIZ_MODE = "live";
    env.QUIZ_API_AUTH = "test-auth";
    env.QUIZ_API_BASE = "https://clashui.inia.fr/api/quiz/";
    env.QUIZ_LENGTH = "10";

    // Mock getLeagues success, then quiz failure
    global.fetch = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([
          { id: 61, name: "Premier League" }
        ]), { status: 200, headers: { "Content-Type": "application/json" } })
      )
      .mockResolvedValueOnce(
        new Response("upstream error", { status: 500 })
      ) as unknown as typeof fetch;

    const res = await app.fetch(new Request("https://example.com/api/quiz/generate", { method: "POST" }), env);
    expect(res.status).toBe(200); // Should succeed with fallback
    const body = await res.json();
    expect(body.source).toBe("mock"); // Should fall back to mock
  });
});
