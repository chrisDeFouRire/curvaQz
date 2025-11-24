import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { QuizResults as QuizResultsType } from "../types/quiz";
import Leaderboard from "./Leaderboard";

type QuizResultsProps = {
  results: QuizResultsType;
  onPlayAgain: () => void;
};

export default function QuizResults({ results, onPlayAgain }: QuizResultsProps) {
  const { score, totalQuestions, answers, quizData } = results;
  const percentage = Math.round((score / totalQuestions) * 100);
  const [shareUrl, setShareUrl] = useState("");
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "shared" | "copied" | "error">("idle");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const getPerformanceMessage = () => {
    if (percentage >= 90) return { message: "Outstanding! 🏆", color: "text-emerald-400" };
    if (percentage >= 70) return { message: "Great job! 🎉", color: "text-cyan-400" };
    if (percentage >= 50) return { message: "Not bad! 👍", color: "text-yellow-400" };
    return { message: "Keep practicing! 💪", color: "text-slate-400" };
  };

  const performance = getPerformanceMessage();
  const shareText = useMemo(
    () => `I scored ${score}/${totalQuestions} on CurvaQz! Can you beat me?`,
    [score, totalQuestions]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("quizId", quizData.quizId);
    const fullUrl = url.toString();
    setShareUrl(fullUrl);
    window.history.replaceState({}, "", url);
  }, [quizData.quizId]);

  const getQrBlob = useCallback(async () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return null;

    return await new Promise<Blob | null>(resolve => {
      canvas.toBlob(blob => resolve(blob), "image/png");
    });
  }, []);

  const copyLink = useCallback(async () => {
    if (!shareUrl) {
      setShareStatus("error");
      setShareMessage("Share link not ready yet.");
      return false;
    }
    setShareMessage(null);
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setShareStatus("error");
      setShareMessage("Clipboard not available for copying.");
      return false;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
      setShareMessage("Link copied—share it anywhere.");
      return true;
    } catch (error) {
      console.error("share.copy.failed", { error });
      setShareStatus("error");
      setShareMessage("Unable to copy the link. Try sharing manually.");
      return false;
    }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    setShareStatus("sharing");
    setShareMessage(null);

    const payload = {
      title: "CurvaQz — Football Quiz",
      text: shareText,
      url: shareUrl
    };

    const canUseWebShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      (typeof navigator.canShare !== "function" || navigator.canShare(payload));

    if (canUseWebShare) {
      try {
        await navigator.share(payload);
        setShareStatus("shared");
        setShareMessage("Share it with your friends to challenge their score!");
        return;
      } catch (error) {
        console.error("share.native.failed", { error });
      }
    }

    const copied = await copyLink();
    if (!copied) {
      setShareStatus("error");
      setShareMessage((prev) => prev ?? "Unable to share right now. Try copying the link manually.");
    }
  }, [copyLink, shareText, shareUrl]);

  const downloadQrCode = useCallback(async () => {
    if (!shareUrl) {
      setShareStatus("error");
      setShareMessage("Share link not ready yet.");
      return;
    }

    const blob = await getQrBlob();
    if (!blob) {
      setShareStatus("error");
      setShareMessage("QR code not ready yet.");
      return;
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `curvaqz-quiz-${quizData.quizId}.png`;
    link.click();
    URL.revokeObjectURL(downloadUrl);

    setShareStatus("shared");
    setShareMessage("QR code saved—share it anywhere.");
  }, [getQrBlob, quizData.quizId, shareUrl]);

  const shareQrCode = useCallback(async () => {
    if (!shareUrl) {
      setShareStatus("error");
      setShareMessage("Share link not ready yet.");
      return;
    }

    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      setShareStatus("error");
      setShareMessage("QR sharing isn't available on this device. Try saving the image instead.");
      return;
    }

    const blob = await getQrBlob();
    if (!blob) {
      setShareStatus("error");
      setShareMessage("Couldn't generate the QR code for sharing.");
      return;
    }

    const qrFile = new File([blob], `curvaqz-quiz-${quizData.quizId}.png`, { type: "image/png" });
    const shareData: ShareData = {
      files: [qrFile],
      title: "CurvaQz — Football Quiz",
      text: shareText,
      url: shareUrl
    };

    if (typeof navigator.canShare === "function" && !navigator.canShare(shareData)) {
      setShareStatus("error");
      setShareMessage("Sharing files isn't supported here. Try saving the QR instead.");
      return;
    }

    try {
      await navigator.share(shareData);
      setShareStatus("shared");
      setShareMessage("QR code shared—challenge accepted!");
    } catch (error) {
      console.error("share.qr.failed", { error });
      setShareStatus("error");
      setShareMessage("Couldn't share the QR. Try saving it instead.");
    }
  }, [getQrBlob, quizData.quizId, shareText, shareUrl]);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-400/20 border border-emerald-500/30">
          <span className="text-3xl">🎯</span>
        </div>

        <h1 className="text-3xl font-semibold text-slate-100">
          Quiz Complete!
        </h1>

        <div className="space-y-2">
          <div className={`text-4xl font-bold ${performance.color}`}>
            {score}/{totalQuestions}
          </div>
          <div className="text-xl text-slate-300">
            {percentage}% correct
          </div>
          <div className={`text-lg font-medium ${performance.color}`}>
            {performance.message}
          </div>
        </div>
      </div>

      <Leaderboard
        quizId={quizData.quizId}
        score={score}
        totalQuestions={totalQuestions}
      />

      <div className="glass rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Share</div>
            <h3 className="text-lg font-semibold text-slate-100">Challenge your friends</h3>
            <p className="text-sm text-emerald-100/80">
              Send this quiz link so they can try to beat your {score}/{totalQuestions} score.
            </p>
          </div>
          <span className="text-xl" aria-hidden>🔗</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr,auto] lg:items-center">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleShare}
                disabled={shareStatus === "sharing" || !shareUrl}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {shareStatus === "sharing" ? "Sharing..." : "Share quiz"}
                <span aria-hidden>→</span>
              </button>
              <button
                onClick={copyLink}
                disabled={!shareUrl}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-400/60 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Copy link
              </button>
            </div>

            <div className="text-xs font-mono text-emerald-200/80 break-all">
              {shareUrl || "Preparing share link..."}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/30 bg-slate-950/30 p-4 shadow-inner shadow-emerald-500/10">
            <div className="rounded-lg bg-white p-3 shadow-md">
              <QRCodeCanvas
                value={shareUrl || "https://curvaqz"}
                size={160}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
                includeMargin
                ref={qrCanvasRef}
              />
            </div>
            <div className="text-center text-xs text-emerald-100/80">
              Scan the QR code to open this quiz
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={downloadQrCode}
                disabled={!shareUrl}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save QR code
              </button>
              <button
                onClick={shareQrCode}
                disabled={!shareUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Share QR code
              </button>
            </div>
          </div>
        </div>

        {shareMessage && (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              shareStatus === "error"
                ? "bg-red-500/10 text-red-100 ring-1 ring-red-500/30"
                : "bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-500/30"
            }`}
          >
            {shareMessage}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">Question Breakdown</h3>

        <div className="space-y-3">
          {answers.map((answer, index) => {
            const question = quizData.questions.find(q => q.id === answer.questionId);
            const selectedOption = question?.options.find(opt => opt.id === answer.optionId);

            return (
              <div
                key={answer.questionId}
                className={`p-4 rounded-lg border ${
                  answer.isCorrect
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                    answer.isCorrect
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-red-500 text-white"
                  }`}>
                    {answer.isCorrect ? "✓" : "✗"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-300 mb-1">
                      Question {index + 1}
                    </div>
                    <div className="text-slate-100 font-medium mb-2">
                      {question?.prompt}
                    </div>
                    <div className={`text-sm ${
                      answer.isCorrect ? "text-emerald-300" : "text-red-300"
                    }`}>
                      Your answer: {selectedOption?.text}
                    </div>
                    {!answer.isCorrect && (
                      <div className="text-sm text-emerald-300 mt-1">
                        Correct: {question?.options.find(opt => opt.isCorrect)?.text}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center space-y-4">
        <div className="text-sm text-slate-400">
          Quiz source: {quizData.source === "live" ? "Live football data" : "Demo questions"}
        </div>

        <button
          onClick={onPlayAgain}
          className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 text-slate-950 font-semibold rounded-lg shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200"
        >
          Play Again
          <span aria-hidden>↻</span>
        </button>
      </div>
    </div>
  );
}
