import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  LeaderboardEntry,
  LeaderboardMeResponse,
  LeaderboardTopResponse,
  SubmitScoreResponse
} from "../types/leaderboard";

type LeaderboardView = "top" | "me";

type LeaderboardProps = {
  quizId: string;
  score: number;
  totalQuestions: number;
};

type FetchState = "idle" | "loading" | "ready" | "error";

function sanitizeNickname(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, 64);
}

function EntryRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
        entry.isMe ? "border-emerald-400/60 bg-emerald-400/5" : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold ${
            entry.isMe ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-100"
          }`}
        >
          {entry.rank}
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-100">{entry.nickname}</div>
          <div className="text-xs text-slate-400">
            {entry.score}/{entry.totalQuestions} pts
            {entry.isMe ? " · You" : ""}
          </div>
        </div>
      </div>
      {entry.isMe && <span className="text-xs font-medium text-emerald-300">My spot</span>}
    </div>
  );
}

function Section({
  title,
  entries,
  emptyText
}: {
  title: string;
  entries: LeaderboardEntry[] | undefined;
  emptyText?: string;
}) {
  if (!entries || entries.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</div>
        <div className="rounded-lg border border-dashed border-slate-800/80 px-3 py-2 text-sm text-slate-400">
          {emptyText ?? "No entries yet"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <EntryRow key={`${entry.rank}-${entry.nickname}-${entry.isMe ? "me" : "other"}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

export default function Leaderboard({ quizId, score, totalQuestions }: LeaderboardProps) {
  const [nickname, setNickname] = useState("Player");
  const [nicknameReady, setNicknameReady] = useState(false);
  const [view, setView] = useState<LeaderboardView>("top");
  const [status, setStatus] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [topData, setTopData] = useState<LeaderboardTopResponse | null>(null);
  const [meData, setMeData] = useState<LeaderboardMeResponse | null>(null);
  const [lastSubmittedQuizId, setLastSubmittedQuizId] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("cq_nickname");
    if (stored) {
      setNickname(stored);
    }
    setNicknameReady(true);
  }, []);

  const persistNickname = useCallback((name: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cq_nickname", name);
  }, []);

  const loadTop = useCallback(async () => {
    const response = await fetch(`/api/leaderboard/${quizId}/top`, {
      credentials: 'same-origin'
    });
    if (!response.ok) {
      throw new Error(`Top leaderboard failed (${response.status})`);
    }
    const data: LeaderboardTopResponse = await response.json();
    setTopData(data);
    return data;
  }, [quizId]);

  const loadMe = useCallback(async () => {
    const response = await fetch(`/api/leaderboard/${quizId}/me`, {
      credentials: 'same-origin'
    });
    if (!response.ok) {
      throw new Error(response.status === 404 ? "Leaderboard entry missing" : `Leaderboard load failed (${response.status})`);
    }
    const data: LeaderboardMeResponse = await response.json();
    setMeData(data);
    return data;
  }, [quizId]);

  const submitScore = useCallback(
    async (overrideNickname?: string) => {
      setStatus("loading");
      setError(null);
      setDuplicateNotice(false);
      setLastSubmittedQuizId(quizId);

      const nicknameToUse = sanitizeNickname(overrideNickname ?? nickname) || "Player";
      persistNickname(nicknameToUse);

      const response = await fetch(`/api/leaderboard/${quizId}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          score,
          totalQuestions,
          nickname: nicknameToUse
        })
      });

      if (!response.ok && response.status !== 409) {
        const payload = (await response.json().catch(() => null)) as SubmitScoreResponse | { error?: string } | null;
        setStatus("error");
        setError(payload && "error" in (payload as Record<string, unknown>) ? (payload as { error?: string }).error ?? "Failed to submit score" : "Failed to submit score");
        return;
      }

      if (response.status === 409) {
        setDuplicateNotice(true);
      }

      setLastSubmittedQuizId(quizId);

      try {
        await Promise.all([loadTop(), loadMe()]);
        setStatus("ready");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load leaderboard";
        setError(message);
        setStatus("error");
      }
    },
    [quizId, loadMe, loadTop, nickname, persistNickname, score, totalQuestions]
  );

  useEffect(() => {
    setTopData(null);
    setMeData(null);
    setDuplicateNotice(false);
    setStatus("idle");
  }, [quizId]);

  useEffect(() => {
    if (!nicknameReady) return;
    if (lastSubmittedQuizId === quizId) return;
    void submitScore();
  }, [lastSubmittedQuizId, nicknameReady, quizId, submitScore]);

  const totalPlayers = useMemo(() => {
    if (meData) return meData.totalPlayers;
    if (topData) return topData.totalPlayers;
    return 0;
  }, [meData, topData]);

  const loadingMessage =
    status === "loading"
      ? "Saving your score and loading the leaderboard…"
      : status === "error"
        ? error || "Unable to load leaderboard right now."
        : null;

  return (
    <div className="glass rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Leaderboard</div>
          <div className="text-lg font-semibold text-slate-100">See how you stack up</div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-sm text-slate-300 ring-1 ring-slate-800/80">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Players</span>
          <span className="font-semibold text-emerald-300">{totalPlayers}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-slate-900/70 p-1 ring-1 ring-slate-800/60">
          <button
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              view === "top"
                ? "bg-slate-800 text-slate-100 shadow-inner"
                : "text-slate-400 hover:text-slate-100"
            }`}
            onClick={() => setView("top")}
          >
            Top 10
          </button>
          <button
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              view === "me"
                ? "bg-slate-800 text-slate-100 shadow-inner"
                : "text-slate-400 hover:text-slate-100"
            }`}
            onClick={() => setView("me")}
          >
            Me
          </button>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Nickname</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="flex-1 min-w-[160px] rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
            placeholder="Enter a nickname"
          />
          <button
            onClick={() => submitScore(nickname)}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Saving..." : "Update leaderboard"}
          </button>
        </div>
      </div>

      {duplicateNotice && (
        <div className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-400/30">
          Your score was already recorded for this quiz. Showing the latest leaderboard.
        </div>
      )}

      {loadingMessage && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
          {loadingMessage}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {view === "top" && (
          <Section
            title="Top 10"
            entries={topData?.entries}
            emptyText={status === "loading" ? "Loading..." : "No scores yet"}
          />
        )}

        {view === "me" && (
          <div className="space-y-4">
            <Section
              title="Top 5"
              entries={meData?.top}
              emptyText={status === "loading" ? "Loading..." : "No entries yet"}
            />
            <Section
              title="My Rank"
              entries={meData ? meData.around : undefined}
              emptyText={status === "loading" ? "Loading..." : "Your score will appear here"}
            />
            <Section
              title="Bottom 5"
              entries={meData?.bottom}
              emptyText={status === "loading" ? "Loading..." : "No entries yet"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
