type QuizProgressProps = {
  currentQuestion: number;
  totalQuestions: number;
  score?: number;
};

export default function QuizProgress({
  currentQuestion,
  totalQuestions,
  score
}: QuizProgressProps) {
  const progressPercentage = ((currentQuestion - 1) / totalQuestions) * 100;

  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between items-center text-sm text-slate-400">
        <span>Progress</span>
        {score !== undefined && (
          <span>Score: {score}/{totalQuestions}</span>
        )}
      </div>

      <div className="relative">
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="flex justify-between mt-2">
          {Array.from({ length: totalQuestions }, (_, i) => {
            const isCompleted = i < currentQuestion - 1;
            const isCurrent = i === currentQuestion - 1;

            return (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-400"
                    : isCurrent
                    ? "bg-cyan-400 shadow-[0_0_8px] shadow-cyan-400/50"
                    : "bg-slate-600"
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="text-center text-sm text-slate-500">
        {currentQuestion} of {totalQuestions} questions
      </div>
    </div>
  );
}
