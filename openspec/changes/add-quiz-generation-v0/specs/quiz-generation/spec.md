## ADDED Requirements
### Requirement: Session-aware quiz generation endpoint
The system SHALL expose an endpoint (e.g., `POST /api/quiz/generate`) that mints or reuses a session via the existing session bootstrap/refresh logic before issuing a quiz instance, keeping play anonymous and tied to that session.

#### Scenario: Bootstrap new visitor and return a quiz
- **GIVEN** a request without a valid session cookie
- **WHEN** the client calls the quiz generation endpoint
- **THEN** the server reuses the existing session helper to create a session, sets the cookies, and returns a quiz payload bound to that session id.

#### Scenario: Handle revoked or missing session gracefully
- **GIVEN** a request with a revoked or missing session that cannot be refreshed
- **WHEN** the quiz generation endpoint is called
- **THEN** the server responds with a clear error (4xx) instructing the client to bootstrap again rather than issuing a quiz.

### Requirement: Quiz sourcing with mock fallback
The system SHALL fetch quiz questions from the external quiz API by default and MUST support a mock mode that serves the bundled `mockup/quizz.json` data for local/dev. The response SHALL include a `source` marker (`live` or `mock`) so the client can label the experience.

#### Scenario: Serve live quiz when upstream available
- **GIVEN** the worker is configured for live mode
- **WHEN** the endpoint calls the external quiz API successfully
- **THEN** the response includes `source: "live"` and the quiz questions returned by the upstream service.

#### Scenario: Serve mock quiz for local/dev
- **GIVEN** the worker is configured for mock mode (or the upstream is intentionally bypassed)
- **WHEN** the endpoint is called
- **THEN** it returns questions loaded from `mockup/quizz.json`, marks `source: "mock"`, and never attempts the upstream call.

### Requirement: Quiz payload contract for V0 play
The quiz generation endpoint SHALL return a normalized payload that the Play screen can consume for the Phase 1 flow: a unique `quizId`, `sessionId`, optional match metadata, and 5–10 questions each with shuffled answer options and a single correct flag.

#### Scenario: Deliver play-ready payload
- **WHEN** a quiz is generated (mock or live)
- **THEN** the response includes `quizId`, `sessionId`, `source`, an array of 5–10 questions with `prompt`, `options[] { text, isCorrect }`, and any available match/fixture metadata.

#### Scenario: New quiz instance per request
- **GIVEN** the same session calls the endpoint multiple times
- **WHEN** each request completes
- **THEN** each response carries a new `quizId` so the player never replays the identical quiz instance.
