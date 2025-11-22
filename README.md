# CurvaQz

CurvaQz webapp built with Astro, React, Tailwind CSS, and Wrangler.

## Getting started

1. Install dependencies: `npm install`
2. Start Astro dev server (UI only): `npm run ui`
3. Build and run with Wrangler locally (Cloudflare Workers): `npm run dev`

## Scripts

- `npm run ui` – Astro dev server for the frontend.
- `npm run dev` – Build Astro output and start Wrangler on port 4321.
- `npm run build` – Production build.
- `npm run preview` – Preview the production build.
- `npm run lint` – Static checks via eslint.

## Notes

- Ensure Wrangler is configured (see `wrangler.jsonc`) for local Workers testing.
- TypeScript support is included; adjust `tsconfig.json` as needed.
