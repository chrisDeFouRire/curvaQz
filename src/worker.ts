import { Hono } from "hono";
import { handleSessionBootstrap, handleSessionRefresh } from "./routes/session";
import { handleGenerateQuiz } from "./routes/quiz";
import {
  handleGetLeaderboardMe,
  handleGetLeaderboardTop,
  handleSubmitScore
} from "./routes/leaderboard";
import type { WorkerEnv } from "./types/worker";

const api = new Hono<{ Bindings: WorkerEnv }>();

api.get("/health", (c) =>
  c.json(
    {
      status: "ok",
      timestamp: Date.now()
    }
  )
);

api.post("/session/bootstrap", handleSessionBootstrap);
api.post("/session/refresh", handleSessionRefresh);
api.post("/quiz/generate", handleGenerateQuiz);
api.post("/leaderboard/:quizId/score", handleSubmitScore);
api.get("/leaderboard/:quizId/top", handleGetLeaderboardTop);
api.get("/leaderboard/:quizId/me", handleGetLeaderboardMe);

const app = new Hono<{ Bindings: WorkerEnv }>();

app.route("/api", api);

app.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Not Found" }, 404);
  }

  if (c.env.ASSETS) {
    const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  }

  return c.text("Not Found", 404);
});

export default {
  fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) =>
    app.fetch(request, env, ctx)
};

export { app };
