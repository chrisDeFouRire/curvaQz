import type { Handler } from "hono";
import { ensureSession } from "./session";
import type { WorkerEnv } from "../types/worker";
import {
  addLeaderboardEntry,
  buildPlayerKey,
  getBottomEntries,
  getEntriesAroundPlayer,
  getPlayerRank,
  getQuiz,
  getTopEntries,
  getTotalPlayers,
  type RankedLeaderboardEntry
} from "../lib/leaderboard";

type LeaderboardEntryDto = {
  rank: number;
  nickname: string;
  score: number;
  totalQuestions: number;
  isMe: boolean;
};

function formatEntry(entry: RankedLeaderboardEntry, playerKey: string | null): LeaderboardEntryDto {
  return {
    rank: entry.rank,
    nickname: entry.nickname,
    score: entry.score,
    totalQuestions: entry.total_questions,
    isMe: playerKey ? entry.player_key === playerKey : false
  };
}

function sanitizeNickname(nickname: string | undefined): string {
  const cleaned = (nickname ?? "").trim();
  if (!cleaned) return "";
  return cleaned.slice(0, 64);
}

export const handleSubmitScore: Handler<{ Bindings: WorkerEnv }> = async (c) => {
  const quizId = c.req.param("quizId");
  if (!quizId) return c.json({ error: "Missing quiz id" }, 400);

  const payload = await c.req.json().catch(() => null);
  const nickname = sanitizeNickname(typeof payload?.nickname === "string" ? payload.nickname : "");
  const score = Number(payload?.score);
  const totalQuestions = Number(payload?.totalQuestions);

  if (!nickname) {
    return c.json({ error: "Nickname is required" }, 400);
  }

  if (!Number.isInteger(score) || !Number.isInteger(totalQuestions) || totalQuestions <= 0) {
    return c.json({ error: "Score and totals must be whole numbers" }, 400);
  }

  if (score < 0 || score > totalQuestions) {
    return c.json({ error: "Score must be between 0 and total questions" }, 400);
  }

  const sessionResult = await ensureSession(c, { createIfMissing: false, replaceRevoked: false });
  if (sessionResult.type === "error") return sessionResult.response;

  const quiz = await getQuiz(c.env.DB, quizId);
  if (!quiz) {
    return c.json({ error: "Quiz not found" }, 404);
  }

  if (quiz.question_count !== totalQuestions) {
    return c.json({ error: "Total questions mismatch" }, 400);
  }

  const session = sessionResult.value.session;
  const playerKey = buildPlayerKey(session.id, session.user_id);

  try {
    await addLeaderboardEntry(c.env.DB, {
      quizId,
      sessionId: session.id,
      userId: session.user_id,
      nickname,
      score,
      totalQuestions
    });
  } catch (error) {
    console.error("leaderboard.submit.failed", { quizId, message: error instanceof Error ? error.message : String(error) });
    return c.json({ error: "Failed to record score" }, 500);
  }

  const ranked = await getPlayerRank(c.env.DB, quizId, playerKey);
  const totalPlayers = await getTotalPlayers(c.env.DB, quizId);

  return c.json({
    quizId,
    totalPlayers,
    entry: ranked ? formatEntry(ranked, playerKey) : null
  });
};

export const handleGetLeaderboardTop: Handler<{ Bindings: WorkerEnv }> = async (c) => {
  const quizId = c.req.param("quizId");
  if (!quizId) return c.json({ error: "Missing quiz id" }, 400);

  const sessionResult = await ensureSession(c, { createIfMissing: true, replaceRevoked: false });
  if (sessionResult.type === "error") return sessionResult.response;

  const playerKey = buildPlayerKey(sessionResult.value.session.id, sessionResult.value.session.user_id);

  const quiz = await getQuiz(c.env.DB, quizId);
  if (!quiz) {
    return c.json({ error: "Quiz not found" }, 404);
  }

  const { entries, totalPlayers } = await getTopEntries(c.env.DB, quizId, 10);

  return c.json({
    quizId,
    totalPlayers,
    entries: entries.map((entry) => formatEntry(entry, playerKey))
  });
};

export const handleGetLeaderboardMe: Handler<{ Bindings: WorkerEnv }> = async (c) => {
  const quizId = c.req.param("quizId");
  if (!quizId) return c.json({ error: "Missing quiz id" }, 400);

  const sessionResult = await ensureSession(c, { createIfMissing: true, replaceRevoked: false });
  if (sessionResult.type === "error") return sessionResult.response;

  const playerKey = buildPlayerKey(sessionResult.value.session.id, sessionResult.value.session.user_id);

  const quiz = await getQuiz(c.env.DB, quizId);
  if (!quiz) {
    return c.json({ error: "Quiz not found" }, 404);
  }

  const playerEntry = await getPlayerRank(c.env.DB, quizId, playerKey);
  if (!playerEntry) {
    return c.json({ error: "Player not found on leaderboard" }, 404);
  }

  const { entries: topEntries, totalPlayers } = await getTopEntries(c.env.DB, quizId, 5);
  const aroundEntries = await getEntriesAroundPlayer(c.env.DB, quizId, playerEntry.rank, 2);
  const bottomEntries = await getBottomEntries(c.env.DB, quizId, 5);

  return c.json({
    quizId,
    totalPlayers,
    player: formatEntry(playerEntry, playerKey),
    top: topEntries.map((entry) => formatEntry(entry, playerKey)),
    around: aroundEntries.map((entry) => formatEntry(entry, playerKey)),
    bottom: bottomEntries.map((entry) => formatEntry(entry, playerKey))
  });
};
