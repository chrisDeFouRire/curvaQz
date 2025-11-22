<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Repository Guidelines

## Project Structure & Module Organization

- Current content lives in `docs/` with product specs (`specs-2025-11-12.md`, `specs-2025-11-21.md`). Keep these updated before implementing changes.
- When adding code, use `src/` for runtime modules, `tests/` for automated checks, and `public/` or `assets/` for static files. Put infra/config artifacts (e.g., `wrangler.toml`) in `infra/` or the root.
- Add brief design notes in `docs/` when architecture or flows diverge from the specs (quiz generation, sharing, monetisation).

## Build, Test, and Development Commands

- No toolchain exists yet; prefer Node + TypeScript with Cloudflare Workers/Vite to match the web-first quiz vision.
- Recommended script names once added:
  - `npm run dev` → start local dev (e.g., `wrangler dev` or Vite server).
  - `npm run build` → production bundle.
  - `npm run lint` and `npm run test` → static checks and unit tests.
- Document any new commands in `package.json` and mirror them here for quick onboarding.

## Coding Style & Naming Conventions

- Default to TypeScript; 2-space indentation; aim for ≤100–120 column width; avoid unchecked `any`.
- Favor domain folders (quiz, creator, sharing, ads) and named exports over large index files.
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`). Run formatter/linter before opening a PR (add Prettier/ESLint configs when the codebase exists).

## Testing Guidelines

- Place fast unit tests next to code or in `tests/` with names like `quiz.spec.ts`.
- Use a lightweight runner (Vitest or Jest) and mock external APIs (football data, Perplexity) plus Cloudflare bindings to keep tests deterministic.
- Target ≥80% coverage as the project grows; add integration/e2e checks for critical flows (play, share, leaderboard) once UI is built.

## Commit & Pull Request Guidelines

- Keep commits small and focused; include a short rationale in the body when behavior changes.
- PRs should: link issues/tasks, summarize user-visible changes, attach screenshots for UI updates, and call out any spec deviations.
- Update `docs/` when product behavior shifts (especially quiz generation, ads, sharing, or monetisation).
- Request review for changes touching gameplay logic, data sources, or security-sensitive configuration.

## Security & Configuration

- Never commit secrets; load API keys and Cloudflare bindings via env vars and config files ignored by git.
- Validate inputs on any public endpoints, avoid logging PII, and rotate keys when rotating services.
