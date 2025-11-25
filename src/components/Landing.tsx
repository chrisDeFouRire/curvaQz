const modes = [
  {
    title: "Classic 10",
    body: "Ten hand-picked questions that mix form, history, and tactics. No lifelines—just you and the clock."
  },
  {
    title: "Time Attack",
    body: "Beat the timer to stack bonus points. Faster answers earn bigger multipliers and bragging rights."
  },
  {
    title: "Rivalry Run",
    body: "Derby-flavoured sets that test your loyalty. Perfect for proving your club trivia on matchday."
  }
];

const perks = [
  { title: "Fresh drops", detail: "New question sets keep pace with the fixtures so every round feels live." },
  { title: "Built for focus", detail: "Clean, distraction-free UI that lets you stay locked on the next question." },
  { title: "Streak energy", detail: "Chain correct answers to light up your streak meter and climb leaderboards." }
];

const lobbyPlayers = [
  { name: "Rivera", score: "12,430", form: "+8" },
  { name: "Inoue", score: "11,980", form: "+5" },
  { name: "Camacho", score: "11,120", form: "+3" }
];

const quickStats = [
  { label: "Questions", value: "10 per run" },
  { label: "Tempo", value: "45s average" },
  { label: "Difficulty", value: "Adaptive" }
];

export default function Landing() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-925 to-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(94,234,212,0.08),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(52,211,153,0.08),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 ring-1 ring-emerald-400/40">
              CurvaQz · Game night
            </div>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Bring your football IQ to the pitch and turn it into a high score.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Rapid-fire quizzes that feel like a match: pressure, pace, and streaks that matter. Every run mixes fresh
              questions from form, history, tactics, and legends so no two rounds are the same.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="/play"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-slate-950 font-semibold shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40"
              >
                Start playing
                <span aria-hidden>⚽</span>
              </a>
              <a
                href="#rules"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900/80 px-4 py-2 text-slate-50 ring-1 ring-slate-700 transition hover:-translate-y-0.5 hover:ring-emerald-400"
              >
                How it works
                <span aria-hidden>→</span>
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {quickStats.map((item) => (
                <div
                  key={item.label}
                  className="glass rounded-xl px-4 py-3 text-sm text-slate-200 ring-1 ring-slate-800/50"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/90">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-50">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass relative overflow-hidden rounded-2xl p-6 ring-1 ring-slate-800/60">
            <div className="absolute inset-x-8 top-6 h-32 rounded-xl bg-gradient-to-br from-emerald-500/30 via-cyan-400/20 to-transparent blur-3xl" />
            <div className="relative space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Kickoff lobby</p>
              <div className="flex flex-col gap-3 rounded-xl bg-slate-900/70 p-4 ring-1 ring-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Next round</p>
                    <p className="text-base font-semibold text-slate-100">10 questions · 1 minute timer</p>
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
                    Open
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  Beat the buzzer, stack streaks, and climb the board before full time.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-900/70 p-4 ring-1 ring-slate-800">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Live boosts</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-200">
                    <li>• +50 for every 3-answer streak</li>
                    <li>• Time Attack doubles your final score</li>
                    <li>• Miss three and the run ends</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-slate-900/70 p-4 ring-1 ring-slate-800">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Top lobby</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {lobbyPlayers.map((player) => (
                      <li key={player.name} className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2">
                        <span className="font-semibold text-slate-50">{player.name}</span>
                        <span className="text-emerald-200">{player.score}</span>
                        <span className="text-xs text-emerald-300">{player.form} form</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="modes" className="grid gap-6 md:grid-cols-3">
          {modes.map((item) => (
            <div key={item.title} className="glass rounded-2xl p-6 ring-1 ring-slate-800/60">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-200/80">Mode</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-50">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>

        <div id="rules" className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass rounded-2xl p-6 ring-1 ring-slate-800/60">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
              How to play
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-200">
              <li>1. Pick a mode and tap &quot;Start playing&quot;.</li>
              <li>2. Answer 10 questions before the clock drains; streaks unlock bonus points.</li>
              <li>3. Bank your score, share it, and jump back in to beat your best.</li>
            </ol>
          </div>
          <div className="glass rounded-2xl p-6 ring-1 ring-slate-800/60">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-sky-400" aria-hidden />
              Why you&apos;ll stay
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {perks.map((perk) => (
                <div key={perk.title} className="rounded-xl bg-slate-900/70 p-4 ring-1 ring-slate-800">
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">{perk.title}</p>
                  <p className="mt-2 text-sm text-slate-300">{perk.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
