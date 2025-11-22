## 1. Implementation
- [x] 1.1 Add a session-aware `/api/quiz/generate` route that reuses existing session bootstrap/refresh helpers before issuing a quiz instance.
- [x] 1.2 Load quiz data from the external quiz API when configured; add a mock mode that serves questions from `mockup/quizz.json` for local/dev.
- [x] 1.3 Return a normalized quiz payload (id, source, metadata, 5–10 questions with shuffled answers/options) that the Play screen can consume.
- [x] 1.4 Include basic telemetry/logging for failures (upstream errors, missing session) without leaking PII.

## 2. Validation
- [x] 2.1 Add unit/integration coverage for the generate route (session required, mock mode path, upstream failure path).
- [x] 2.2 Document how to toggle mock vs live mode and how sessions are expected to be present in requests.
