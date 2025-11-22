## Why
With the quiz generation backend complete, we need a client-side UI to make the V0 experience playable. Users should be able to start a quiz, answer questions, see their results, and play again - all within the existing Astro + React architecture.

## What Changes
- Add a quiz play page (`/play`) that replaces the landing page content when users want to start playing
- Create React components for quiz display (question cards, answer options, progress indicators, results screen)
- Implement client-side quiz state management (current question, answers, scoring)
- Add navigation between landing page and quiz flow
- Ensure the UI works with both mock and live quiz sources

## Impact
- Affected specs: quiz-ui
- Affected code: new React components in `src/components/`, new Astro page in `src/pages/play.astro`, updates to existing landing page for navigation
