import type { SessionRow } from "../../src/lib/db";
import type { LeaderboardEntryRow, QuizRow } from "../../src/lib/leaderboard";
import type { WorkerEnv } from "../../src/types/worker";

class MockStatement {
  private bindings: unknown[] = [];

  constructor(private readonly db: MockD1, private readonly query: string) {}

  bind(...values: unknown[]): MockStatement {
    this.bindings = values;
    return this;
  }

  async run() {
    return this.execute("run");
  }

  async first<T>() {
    return (await this.execute("first")) as T | null;
  }

  async all<T>() {
    return { results: (await this.execute("all")) as T[] };
  }

  private async execute(_mode: "run" | "first") {
    if (this.query.startsWith("INSERT INTO sessions")) {
      const [id, userId, createdAt, lastSeenAt] = this.bindings as [string, string | null, string, string];
      this.db.sessions.set(id, {
        id,
        user_id: userId ?? null,
        created_at: createdAt,
        last_seen_at: lastSeenAt,
        revoked: 0
      });
      return null;
    }

    if (this.query.startsWith("INSERT INTO quizzes")) {
      const [id, sessionId, userId, source, questionCount, metadata, createdAt] = this
        .bindings as [string, string, string | null, string, number, string | null, string];

      this.db.quizzes.set(id, {
        id,
        session_id: sessionId,
        user_id: userId ?? null,
        source,
        question_count: questionCount,
        metadata: metadata ?? null,
        created_at: createdAt
      });
      return null;
    }

    if (this.query.startsWith("SELECT id, score, total_questions, created_at FROM quiz_leaderboard_entries")) {
      const [quizId, playerKey] = this.bindings as [string, string];
      const existing = this.db.leaderboardEntries.find(
        (entry) => entry.quiz_id === quizId && entry.player_key === playerKey
      );
      return existing ? { id: 1, score: existing.score, total_questions: existing.total_questions, created_at: existing.created_at } : null;
    }

    if (this.query.startsWith("SELECT quiz_id, player_key, session_id, user_id, nickname, score, total_questions, created_at")) {
      const [quizId, playerKey] = this.bindings as [string, string];
      return this.db.leaderboardEntries.find(
        (entry) => entry.quiz_id === quizId && entry.player_key === playerKey
      ) ?? null;
    }

    if (this.query.includes("UPDATE quiz_leaderboard_entries") && this.query.includes("SET nickname")) {
      const [nickname, createdAt, quizId, playerKey] = this.bindings as [string, string, string, string];
      const existingIndex = this.db.leaderboardEntries.findIndex(
        (entry) => entry.quiz_id === quizId && entry.player_key === playerKey
      );
      if (existingIndex >= 0) {
        this.db.leaderboardEntries[existingIndex].nickname = nickname;
        this.db.leaderboardEntries[existingIndex].created_at = createdAt;
      }
      return null;
    }

    if (this.query.startsWith("INSERT INTO quiz_leaderboard_entries")) {
      const [quizId, playerKey, sessionId, userId, nickname, score, totalQuestions, createdAt] = this
        .bindings as [string, string, string, string | null, string, number, number, string];

      // Check if entry already exists (this should be handled by the application logic now)
      const existingIndex = this.db.leaderboardEntries.findIndex(
        (entry) => entry.quiz_id === quizId && entry.player_key === playerKey
      );

      if (existingIndex >= 0) {
        // Update existing entry
        this.db.leaderboardEntries[existingIndex] = {
          quiz_id: quizId,
          player_key: playerKey,
          session_id: sessionId,
          user_id: userId ?? null,
          nickname,
          score,
          total_questions: totalQuestions,
          created_at: createdAt
        };
      } else {
        // Insert new entry
        this.db.leaderboardEntries.push({
          quiz_id: quizId,
          player_key: playerKey,
          session_id: sessionId,
          user_id: userId ?? null,
          nickname,
          score,
          total_questions: totalQuestions,
          created_at: createdAt
        });
      }
      return null;
    }

    if (this.query.startsWith("SELECT COUNT(*) as total FROM quiz_leaderboard_entries")) {
      const [quizId] = this.bindings as [string];
      const total = this.db.leaderboardEntries.filter((entry) => entry.quiz_id === quizId).length;
      return { total };
    }

    if (this.query.includes("RANK() OVER")) {
      const quizId = this.bindings[0] as string;
      const ranked = this.db.computeRankedEntries(quizId);

      if (this.query.includes("player_key = ?")) {
        const [, playerKey] = this.bindings as [string, string];
        return ranked.find((entry) => entry.player_key === playerKey) ?? null;
      }

      if (this.query.includes("rank BETWEEN")) {
        const [, lower, upper] = this.bindings as [string, number, number];
        return ranked.filter((entry) => entry.rank >= lower && entry.rank <= upper);
      }

      if (this.query.includes("ORDER BY rank DESC")) {
        const [, limit] = this.bindings as [string, number];
        return ranked.slice(-limit).reverse();
      }

      if (this.query.includes("ORDER BY score DESC")) {
        const [, limit] = this.bindings as [string, number];
        return ranked.slice(0, limit);
      }
    }

    if (this.query.startsWith("UPDATE sessions SET last_seen_at")) {
      const [ts, id] = this.bindings as [string, string];
      const session = this.db.sessions.get(id);
      if (session) {
        session.last_seen_at = ts;
        this.db.sessions.set(id, session);
      }
      return null;
    }

    if (this.query.startsWith("UPDATE sessions SET user_id")) {
      const [userId, ts, id] = this.bindings as [string, string, string];
      const session = this.db.sessions.get(id);
      if (session) {
        session.user_id = userId;
        session.last_seen_at = ts;
        this.db.sessions.set(id, session);
      }
      return null;
    }

    if (this.query.startsWith("SELECT id, user_id")) {
      const [id] = this.bindings as [string];
      return this.db.sessions.get(id) ?? null;
    }

    if (this.query.startsWith("SELECT id, session_id")) {
      const [id] = this.bindings as [string];
      return this.db.quizzes.get(id) ?? null;
    }

    throw new Error(`Unhandled query in mock D1: ${this.query}`);
  }
}

export class MockD1 {
  sessions = new Map<string, SessionRow>();
  quizzes = new Map<string, QuizRow>();
  leaderboardEntries: LeaderboardEntryRow[] = [];

  computeRankedEntries(quizId: string) {
    const entries = this.leaderboardEntries
      .filter((entry) => entry.quiz_id === quizId)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.created_at.localeCompare(b.created_at);
      });

    let lastScore: number | null = null;
    let lastRank = 0;
    return entries.map((entry, index) => {
      const rank = lastScore === entry.score ? lastRank : index + 1;
      lastScore = entry.score;
      lastRank = rank;
      return { ...entry, rank };
    });
  }

  prepare(query: string): MockStatement {
    return new MockStatement(this, query);
  }
}

export function createMockEnv(base?: Partial<WorkerEnv>): WorkerEnv {
  return {
    AUTH_SECRET: "test-secret",
    DB: new MockD1() as unknown as D1Database,
    JWT_ISSUER: "test-issuer",
    ...base
  } as unknown as WorkerEnv;
}
