import { useEffect } from "react";
import { useQuiz } from "../lib/useQuiz";
import QuizQuestion from "./QuizQuestion";
import QuizProgress from "./QuizProgress";
import QuizResults from "./QuizResults";

export default function QuizPlay() {
  const {
    quizState,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    score,
    results,
    error,
    generateQuiz,
    answerQuestion,
    resetQuiz,
    isAnswered
  } = useQuiz();

  useEffect(() => {
    generateQuiz();
  }, [generateQuiz]);

  if (quizState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-400/20 border border-emerald-500/30">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">Generating your quiz...</h2>
          <p className="text-slate-400">Getting fresh football questions ready</p>
        </div>
      </div>
    );
  }

  if (quizState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30">
            <span className="text-2xl text-red-400">⚠️</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-100">Something went wrong</h2>
            <p className="text-slate-400">{error || "Failed to load quiz"}</p>
          </div>

          <button
            onClick={generateQuiz}
            className="w-full px-6 py-3 bg-emerald-500 text-slate-950 font-semibold rounded-lg shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (quizState === "completed" && results) {
    return (
      <div className="min-h-screen py-12 px-6">
        <div className="mx-auto max-w-2xl">
          <QuizResults results={results} onPlayAgain={resetQuiz} />
        </div>
      </div>
    );
  }

  if (quizState === "playing" && currentQuestion) {
    return (
      <div className="min-h-screen py-12 px-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <QuizProgress
            currentQuestion={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            score={score}
          />

          <QuizQuestion
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={totalQuestions}
            onAnswer={answerQuestion}
            isAnswered={isAnswered(currentQuestion.id)}
          />
        </div>
      </div>
    );
  }

  return null;
}
