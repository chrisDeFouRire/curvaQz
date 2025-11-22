import type { SessionRow } from "../../src/lib/db";
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

    throw new Error(`Unhandled query in mock D1: ${this.query}`);
  }
}

export class MockD1 {
  sessions = new Map<string, SessionRow>();

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
