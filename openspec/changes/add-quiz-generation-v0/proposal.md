## Why
Roadmap Phase 1 starts with a quiz generation step so players can instantly enter the play flow. We need a server-backed quiz generator that reuses the existing session plumbing and can run even when the upstream quiz API is unavailable by serving a mocked quiz.

## What Changes
- Add a session-aware quiz generation endpoint that issues a new quiz instance for the player.
- Source quiz data from the external quiz API when configured, with a mock fallback using `mockup/quizz.json` for local/dev.
- Return a consistent quiz payload (id, metadata, 5–10 questions with shuffled answers) that the Play screen can consume next.
- Keep anonymous play: reuse the current session bootstrap/refresh logic rather than introducing new auth flows.

## Impact
- Affected specs: quiz-generation
- Affected code: worker API routes, session handling helpers (`src/lib/db.ts`, `src/routes/session.ts`), quiz API client (`src/lib/qz-api.ts`), mock data wiring.
