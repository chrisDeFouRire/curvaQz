## Why
Quizzes currently generate ephemeral IDs that are not persisted, so we cannot attach scores or rankings. We need a stored quiz identifier with a leaderboard that records each player's score once and exposes ranked views.

## What Changes
- Persist a unique quiz ID on generation for attaching leaderboard data.
- Add leaderboard storage, APIs, and client logic to record one score per player (session/user), compute ranks, and expose Top 10 and "Me" views with totals.
- Introduce frontend UI for leaderboard display and score submission after quiz completion.

## Impact
- Affected specs: leaderboard
- Affected code: quiz generation route, new leaderboard library/endpoints, results UI, D1 migrations/schema
