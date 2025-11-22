## ADDED Requirements
### Requirement: Persisted quiz identifiers
The system SHALL store each generated quiz with a unique quiz id when served to a session, capturing source and question count for leaderboard linking.

#### Scenario: Store quiz on generation
- **GIVEN** a quiz is generated for a session
- **WHEN** the generation endpoint returns the quiz payload
- **THEN** the quiz id is persisted server-side with creation timestamp and question count.

#### Scenario: Always issue new quiz ids
- **GIVEN** the same session calls quiz generation multiple times
- **WHEN** each quiz is issued
- **THEN** each response carries a distinct quiz id persisted in storage.

### Requirement: Single leaderboard entry per player per quiz
The system SHALL record each finished quiz attempt into a leaderboard table keyed by quiz id and player identity (user id when available, otherwise session id) and MUST reject duplicates so a player appears only once per quiz.

#### Scenario: Record score with nickname
- **GIVEN** a player completes a quiz
- **WHEN** they submit their score and nickname
- **THEN** a leaderboard entry is stored with quiz id, score, total questions, nickname, and player identity (user id and/or session id) for that quiz.

#### Scenario: Prevent duplicate plays
- **GIVEN** the same player (user id or session id) tries to submit another score for the same quiz
- **WHEN** the leaderboard write is attempted
- **THEN** the system rejects the duplicate and preserves the original entry.

### Requirement: Leaderboard views with rankings
The system SHALL provide leaderboard queries that return ranks, player nicknames, scores, and total participant counts for a quiz, supporting both a Top 10 view and a "Me" view that includes the player's row and surrounding context.

#### Scenario: Fetch top 10 leaderboard
- **GIVEN** there are recorded scores for a quiz
- **WHEN** the Top 10 view is requested
- **THEN** the response includes up to the ten highest-ranked entries with rank values and the total number of players.

#### Scenario: Fetch contextual view around player
- **GIVEN** a player has a leaderboard entry
- **WHEN** the "Me" view is requested
- **THEN** the response includes the top five entries, the player's ranked entry with nearby neighbors, the bottom five entries, and the total number of players.
