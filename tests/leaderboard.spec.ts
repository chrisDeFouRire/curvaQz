import { beforeEach, describe, expect, it, vi } from "vitest";
import { addLeaderboardEntry, buildPlayerKey, DuplicateLeaderboardEntryError, getEntriesAroundPlayer, getPlayerRank, getTopEntries, recordQuiz } from "../src/lib/leaderboard";
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

function joinCookies(cookies: string[]): string {
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

describe("leaderboard library", () => {
  let db: MockD1;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    db = new MockD1();
  });

  it("ranks entries and prevents duplicates", async () => {
    await recordQuiz(db as unknown as D1Database, {
      id: "quiz-1",
      sessionId: "s1",
      source: "mock",
      questionCount: 5
    });

    const playerA = buildPlayerKey("sA");
    const playerB = buildPlayerKey("sB");
    const playerC = buildPlayerKey("sC");

    await addLeaderboardEntry(db as unknown as D1Database, {
      quizId: "quiz-1",
      sessionId: "sA",
      nickname: "Alice",
      score: 4,
      totalQuestions: 5
    });

    vi.setSystemTime(new Date("2024-01-01T00:01:00.000Z"));
    await addLeaderboardEntry(db as unknown as D1Database, {
      quizId: "quiz-1",
      sessionId: "sB",
      nickname: "Bob",
      score: 5,
      totalQuestions: 5
    });

    vi.setSystemTime(new Date("2024-01-01T00:02:00.000Z"));
    await addLeaderboardEntry(db as unknown as D1Database, {
      quizId: "quiz-1",
      sessionId: "sC",
      nickname: "Cara",
      score: 5,
      totalQuestions: 5
    });

    await expect(
      addLeaderboardEntry(db as unknown as D1Database, {
        quizId: "quiz-1",
        sessionId: "sA",
        nickname: "Alice",
        score: 3,
        totalQuestions: 5
      })
    ).rejects.toBeInstanceOf(DuplicateLeaderboardEntryError);

    const top = await getTopEntries(db as unknown as D1Database, "quiz-1", 10);
    expect(top.totalPlayers).toBe(3);
    expect(top.entries[0].rank).toBe(1);
    expect(top.entries[1].rank).toBe(1);
    expect(top.entries[2].rank).toBe(3);

    const playerCRank = await getPlayerRank(db as unknown as D1Database, "quiz-1", playerC);
    expect(playerCRank?.rank).toBe(1);

    const around = await getEntriesAroundPlayer(db as unknown as D1Database, "quiz-1", playerCRank?.rank ?? 0, 1);
    expect(around.map((entry) => entry.nickname)).toEqual(["Bob", "Cara"]);
  });
});

describe("leaderboard routes", () => {
  let env: WorkerEnv;
  let db: MockD1;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    db = new MockD1();
    env = {
      AUTH_SECRET: "test-secret",
      DB: db as unknown as D1Database,
      JWT_ISSUER: "test-issuer",
      QUIZ_MODE: "mock"
    } as unknown as WorkerEnv;
  });

  it("submits a score and returns leaderboard views", async () => {
    const bootstrapRes = await app.fetch(
      new Request("https://example.com/api/session/bootstrap", { method: "POST" }),
      env
    );
    const bootstrapCookies = getCookies(bootstrapRes);
    const cookieHeader = joinCookies(bootstrapCookies);

    const quizRes = await app.fetch(
      new Request("https://example.com/api/quiz/generate", {
        method: "POST",
        headers: { cookie: cookieHeader }
      }),
      env
    );
    const quizBody = await quizRes.json() as { quizId: string };
    expect(quizBody.quizId).toBeTruthy();

    const submitRes = await app.fetch(
      new Request(`https://example.com/api/leaderboard/${quizBody.quizId}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieHeader
        },
        body: JSON.stringify({ score: 4, totalQuestions: 5, nickname: "Alice" })
      }),
      env
    );
    expect(submitRes.status).toBe(200);
    const submitBody = await submitRes.json() as { entry: { rank: number; isMe: boolean } | null };
    expect(submitBody.entry?.rank).toBe(1);
    expect(submitBody.entry?.isMe).toBe(true);

    const topRes = await app.fetch(
      new Request(`https://example.com/api/leaderboard/${quizBody.quizId}/top`, {
        headers: { cookie: cookieHeader }
      }),
      env
    );
    const topBody = await topRes.json() as { entries: Array<{ rank: number; isMe: boolean }>; totalPlayers: number };
    expect(topBody.totalPlayers).toBe(1);
    expect(topBody.entries[0].rank).toBe(1);
    expect(topBody.entries[0].isMe).toBe(true);

    const meRes = await app.fetch(
      new Request(`https://example.com/api/leaderboard/${quizBody.quizId}/me`, {
        headers: { cookie: cookieHeader }
      }),
      env
    );
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json() as { player: { rank: number; isMe: boolean }; totalPlayers: number };
    expect(meBody.totalPlayers).toBe(1);
    expect(meBody.player.rank).toBe(1);
    expect(meBody.player.isMe).toBe(true);
  });

  it("rejects duplicate submissions for the same player", async () => {
    const bootstrapRes = await app.fetch(
      new Request("https://example.com/api/session/bootstrap", { method: "POST" }),
      env
    );
    const cookieHeader = joinCookies(getCookies(bootstrapRes));

    const quizRes = await app.fetch(
      new Request("https://example.com/api/quiz/generate", {
        method: "POST",
        headers: { cookie: cookieHeader }
      }),
      env
    );
    const quizBody = await quizRes.json() as { quizId: string };

    const first = await app.fetch(
      new Request(`https://example.com/api/leaderboard/${quizBody.quizId}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieHeader
        },
        body: JSON.stringify({ score: 3, totalQuestions: 5, nickname: "Player1" })
      }),
      env
    );
    expect(first.status).toBe(200);

    const duplicate = await app.fetch(
      new Request(`https://example.com/api/leaderboard/${quizBody.quizId}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieHeader
        },
        body: JSON.stringify({ score: 4, totalQuestions: 5, nickname: "Player1" })
      }),
      env
    );
    expect(duplicate.status).toBe(409);
    const duplicateBody = await duplicate.json() as { error?: string };
    expect(duplicateBody.error).toBe("Score already recorded");
  });
});
