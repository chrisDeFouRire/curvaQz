import type { QuizResults as QuizResultsType } from "../types/quiz";

type QuizResultsProps = {
  results: QuizResultsType;
  onPlayAgain: () => void;
};

export default function QuizResults({ results, onPlayAgain }: QuizResultsProps) {
  const { score, totalQuestions, answers, quizData } = results;
  const percentage = Math.round((score / totalQuestions) * 100);

  const getPerformanceMessage = () => {
    if (percentage >= 90) return { message: "Outstanding! 🏆", color: "text-emerald-400" };
    if (percentage >= 70) return { message: "Great job! 🎉", color: "text-cyan-400" };
    if (percentage >= 50) return { message: "Not bad! 👍", color: "text-yellow-400" };
    return { message: "Keep practicing! 💪", color: "text-slate-400" };
  };

  const performance = getPerformanceMessage();

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
