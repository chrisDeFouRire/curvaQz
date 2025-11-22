import type { QuizMode } from "../types/quiz";

export type QuizRow = {
  id: string;
  session_id: string;
  user_id: string | null;
  source: QuizMode;
  question_count: number;
  metadata: string | null;
  created_at: string;
};

export type LeaderboardEntryRow = {
  quiz_id: string;
  player_key: string;
  session_id: string;
  user_id: string | null;
  nickname: string;
  score: number;
  total_questions: number;
  created_at: string;
};

export type RankedLeaderboardEntry = LeaderboardEntryRow & {
  rank: number;
};

export class DuplicateLeaderboardEntryError extends Error {
  constructor() {
    super("Player already recorded for this quiz");
    this.name = "DuplicateLeaderboardEntryError";
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export function buildPlayerKey(sessionId: string, userId?: string | null): string {
  return userId ? `user:${userId}` : `session:${sessionId}`;
}

export async function recordQuiz(
  db: D1Database,
  quiz: {
    id: string;
    sessionId: string;
    userId?: string | null;
    source: QuizMode;
    questionCount: number;
    metadata?: Record<string, unknown> | null;
  }
): Promise<QuizRow> {
  const createdAt = nowIso();
  const metadataJson = quiz.metadata ? JSON.stringify(quiz.metadata) : null;

  await db
    .prepare(
      `INSERT INTO quizzes (id, session_id, user_id, source, question_count, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      quiz.id,
      quiz.sessionId,
      quiz.userId ?? null,
      quiz.source,
      quiz.questionCount,
      metadataJson,
      createdAt
    )
    .run();

  return {
    id: quiz.id,
    session_id: quiz.sessionId,
    user_id: quiz.userId ?? null,
    source: quiz.source,
    question_count: quiz.questionCount,
    metadata: metadataJson,
    created_at: createdAt
  };
}

export async function getQuiz(db: D1Database, quizId: string): Promise<QuizRow | null> {
  const quiz = await db
    .prepare(
      `SELECT id, session_id, user_id, source, question_count, metadata, created_at
       FROM quizzes
       WHERE id = ?
       LIMIT 1`
    )
    .bind(quizId)
    .first<QuizRow>();

  return quiz ?? null;
}

export async function addLeaderboardEntry(
  db: D1Database,
  entry: {
    quizId: string;
    sessionId: string;
    userId?: string | null;
    nickname: string;
    score: number;
    totalQuestions: number;
  }
): Promise<LeaderboardEntryRow> {
  const createdAt = nowIso();
  const playerKey = buildPlayerKey(entry.sessionId, entry.userId);

  try {
    await db
      .prepare(
        `INSERT INTO quiz_leaderboard_entries
         (quiz_id, player_key, session_id, user_id, nickname, score, total_questions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        entry.quizId,
        playerKey,
        entry.sessionId,
        entry.userId ?? null,
        entry.nickname,
        entry.score,
        entry.totalQuestions,
        createdAt
      )
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE") || message.includes("idx_quiz_leaderboard_unique_player")) {
      throw new DuplicateLeaderboardEntryError();
    }
    throw error;
  }

  return {
    quiz_id: entry.quizId,
    player_key: playerKey,
    session_id: entry.sessionId,
    user_id: entry.userId ?? null,
    nickname: entry.nickname,
    score: entry.score,
    total_questions: entry.totalQuestions,
    created_at: createdAt
  };
}

export async function getTotalPlayers(db: D1Database, quizId: string): Promise<number> {
  const result = await db
    .prepare(`SELECT COUNT(*) as total FROM quiz_leaderboard_entries WHERE quiz_id = ?`)
    .bind(quizId)
    .first<{ total: number }>();

  return result ? Number(result.total) : 0;
}

const RANKED_ENTRIES_BASE = `
  SELECT
    quiz_id,
    player_key,
    session_id,
    user_id,
    nickname,
    score,
    total_questions,
    created_at,
    RANK() OVER (PARTITION BY quiz_id ORDER BY score DESC, created_at ASC) AS rank
  FROM quiz_leaderboard_entries
`;

export async function getTopEntries(
  db: D1Database,
  quizId: string,
  limit = 10
): Promise<{ totalPlayers: number; entries: RankedLeaderboardEntry[] }> {
  const totalPlayers = await getTotalPlayers(db, quizId);

  const { results } = await db
    .prepare(
      `${RANKED_ENTRIES_BASE}
       WHERE quiz_id = ?
       ORDER BY score DESC, created_at ASC
       LIMIT ?`
    )
    .bind(quizId, limit)
    .all<RankedLeaderboardEntry>();

  return {
    totalPlayers,
    entries: results ?? []
  };
}

export async function getPlayerRank(
  db: D1Database,
  quizId: string,
  playerKey: string
): Promise<RankedLeaderboardEntry | null> {
  const player = await db
    .prepare(
      `SELECT *
       FROM (${RANKED_ENTRIES_BASE})
       WHERE quiz_id = ? AND player_key = ?
       LIMIT 1`
    )
    .bind(quizId, playerKey)
    .first<RankedLeaderboardEntry>();

  return player ?? null;
}

export async function getBottomEntries(
  db: D1Database,
  quizId: string,
  limit = 5
): Promise<RankedLeaderboardEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM (
        ${RANKED_ENTRIES_BASE}
        WHERE quiz_id = ?
      )
      ORDER BY rank DESC
      LIMIT ?`
    )
    .bind(quizId, limit)
    .all<RankedLeaderboardEntry>();

  const entries = results ?? [];
  return entries.sort((a, b) => a.rank - b.rank);
}

export async function getEntriesAroundPlayer(
  db: D1Database,
  quizId: string,
  playerRank: number,
  radius = 2
): Promise<RankedLeaderboardEntry[]> {
  const lower = Math.max(1, playerRank - radius);
  const upper = playerRank + radius;

  const { results } = await db
    .prepare(
      `SELECT * FROM (
        ${RANKED_ENTRIES_BASE}
        WHERE quiz_id = ?
      )
      WHERE rank BETWEEN ? AND ?
      ORDER BY rank ASC`
    )
    .bind(quizId, lower, upper)
    .all<RankedLeaderboardEntry>();

  return results ?? [];
}
