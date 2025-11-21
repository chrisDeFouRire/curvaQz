import React from "react";
import { renderToString } from "react-dom/server";
import appCss from "./styles/tailwind.css";

type Env = Record<string, unknown>;

const App: React.FC = () => (
  <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-slate-50">
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            CurvaQz Football Quiz
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">React + Worker + Tailwind</h1>
          <p className="text-slate-300">
            Single codebase serving the UI directly from the Cloudflare Worker.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-900/50 px-4 py-3 shadow-xl ring-1 ring-slate-700/70">
          <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px] shadow-emerald-400"></span>
          <div>
            <p className="text-xs text-slate-400">Status</p>
            <p className="text-sm font-medium text-emerald-200">Worker live</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800/80">
          <h2 className="text-xl font-semibold text-emerald-200">Why this setup</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li>• React + TypeScript rendered to HTML inside the Worker.</li>
            <li>• Tailwind styles compiled once and served via the same Worker.</li>
            <li>• No separate frontend/backend folders; everything lives in `src/`.</li>
            <li>• Extend this by adding routes for APIs and UI in the same entry.</li>
          </ul>
        </article>

        <aside className="rounded-2xl bg-slate-900/60 p-6 ring-1 ring-slate-800/80">
          <h3 className="text-lg font-semibold text-emerald-200">Quick links</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-200">
            <p>• HTML: <code className="font-mono text-emerald-300">src/index.tsx</code></p>
            <p>• CSS build: <code className="font-mono text-emerald-300">npm run tailwind:build</code></p>
            <p>• Dev server: <code className="font-mono text-emerald-300">npm run dev</code></p>
          </div>
        </aside>
      </div>

      <footer className="flex flex-col gap-2 rounded-2xl bg-slate-900/60 p-6 text-sm text-slate-300 ring-1 ring-slate-800/80">
        <p>Try hitting <code className="font-mono text-emerald-300">/api/health</code> to confirm the worker route.</p>
        <p>Replace this UI with the quiz screens; the worker will keep serving them without extra routing.</p>
      </footer>
    </section>
  </main>
);

const HtmlShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>CurvaQz Worker + React</title>
      <link rel="stylesheet" href="/app.css" />
    </head>
    <body className="antialiased">{children}</body>
  </html>
);

function renderDocument() {
  const appHtml = renderToString(
    <HtmlShell>
      <App />
    </HtmlShell>
  );
  return "<!DOCTYPE html>" + appHtml;
}

const commonHeaders = {
  "x-powered-by": "curvaqz-worker"
};

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/app.css") {
      return new Response(appCss, {
        headers: {
          "content-type": "text/css; charset=utf-8",
          ...commonHeaders
        }
      });
    }

    if (url.pathname === "/api/health") {
      return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
        headers: {
          "content-type": "application/json",
          ...commonHeaders
        }
      });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: commonHeaders });
    }

    return new Response(renderDocument(), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        ...commonHeaders
      }
    });
  }
};
