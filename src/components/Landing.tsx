import React, { useEffect, useState } from "react";

type HealthState = "checking" | "ok" | "error";

const features = [
  {
    title: "Edge delivery",
    body: "Astro builds static pages that Cloudflare serves instantly with zero cold starts."
  },
  {
    title: "React islands",
    body: "Hydrate only what needs interactivity; everything else ships as lightweight HTML."
  },
  {
    title: "Worker API",
    body: "Keep the quiz API and UI together inside a single Worker codebase."
  }
];

export default function Landing() {
  const [health, setHealth] = useState<HealthState>("checking");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) throw new Error("Health check failed");
        await res.json();
        setHealth("ok");
        setLatency(Math.round(performance.now() - start));
      })
      .catch(() => {
        setHealth("error");
      });
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-925 to-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(94,234,212,0.08),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(52,211,153,0.08),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 ring-1 ring-emerald-400/40">
              CurvaQz · Astro front-end
            </div>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              A football quiz, rendered by Astro and shipped from the worker edge.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              The UI is built with Astro + Tailwind, React islands for interactivity, and the Cloudflare
              Worker keeps the API and static assets together. Swap in the quiz screens without changing
              the hosting pattern.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full bg-slate-900/80 px-3 py-1 ring-1 ring-slate-700">
                Astro static output
              </span>
              <span className="rounded-full bg-slate-900/80 px-3 py-1 ring-1 ring-slate-700">
                React hydrated islands
              </span>
              <span className="rounded-full bg-slate-900/80 px-3 py-1 ring-1 ring-slate-700">
                Cloudflare Worker APIs
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              <a
                href="#stack"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40"
              >
                Explore the stack
                <span aria-hidden>→</span>
              </a>
              <a
                href="/api/health"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900/80 px-4 py-2 text-slate-50 ring-1 ring-slate-700 transition hover:-translate-y-0.5 hover:ring-emerald-400"
              >
                Call /api/health
              </a>
            </div>
          </div>

          <div className="glass relative overflow-hidden rounded-2xl p-6">
            <div className="absolute inset-x-8 top-6 h-32 rounded-xl bg-gradient-to-br from-emerald-500/30 via-cyan-400/20 to-transparent blur-3xl" />
            <div className="relative space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Worker status</p>
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full shadow-[0_0_14px] ${
                    health === "ok"
                      ? "bg-emerald-400 shadow-emerald-400/80"
                      : health === "error"
                        ? "bg-amber-400 shadow-amber-400/80"
                        : "bg-sky-300 shadow-sky-300/80"
                  }`}
                  aria-hidden
                />
                <div>
                  <p className="text-xs text-slate-400">Health endpoint</p>
                  <p className="text-sm font-medium text-slate-100">
                    {health === "ok"
                      ? "Live"
                      : health === "error"
                        ? "Error"
                        : "Checking…"}
                    {latency !== null && health === "ok" ? ` • ${latency} ms` : ""}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-slate-900/70 p-4 ring-1 ring-slate-800">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Deployment model</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  <li>• Astro builds to `dist/`</li>
                  <li>• Wrangler serves assets + Worker API</li>
                  <li>• React islands hydrate where needed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div id="stack" className="grid gap-6 md:grid-cols-2">
          {features.map((item) => (
            <div key={item.title} className="glass rounded-2xl p-6 ring-1 ring-slate-800/60">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-200/80">Feature</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-50">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass rounded-2xl p-6 ring-1 ring-slate-800/60">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
              Deployment flow
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-200">
              <li>1. Run `npm run build` to generate the Astro site into <code className="font-mono">dist/</code>.</li>
              <li>2. Wrangler uploads the static assets and binds them to the worker.</li>
              <li>
                3. The worker serves <code className="font-mono">/api/*</code> responses while assets are handled
                automatically.
              </li>
            </ol>
          </div>
          <div className="glass rounded-2xl p-6 ring-1 ring-slate-800/60">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-sky-400" aria-hidden />
              Quiz ready
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Plug the quiz React screens into this Astro page, or add API routes to <code className="font-mono">src/worker.ts</code>.
              The worker, UI, and Tailwind styling stay in sync without extra hosting layers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
