import { useState, useEffect } from "react";
import type { QuizQuestion as QuizQuestionType, QuizAnswer } from "../types/quiz";

type QuizQuestionProps = {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: QuizAnswer) => void;
  isAnswered?: boolean;
};

export default function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isAnswered = false
}: QuizQuestionProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedOptionId(null);
    setHasSubmitted(false);
  }, [question.id]);

  const handleOptionClick = (optionId: string) => {
    if (hasSubmitted || isAnswered) return;

    setSelectedOptionId(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOptionId || hasSubmitted) return;

    const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
    if (!selectedOption) return;

    const answer: QuizAnswer = {
      questionId: question.id,
      optionId: selectedOptionId,
      isCorrect: selectedOption.isCorrect
    };

    setHasSubmitted(true);
    onAnswer(answer);
  };

  const getOptionClassName = (optionId: string) => {
    const baseClasses = "w-full p-4 text-left rounded-lg border transition-all duration-200";

    if (!hasSubmitted && !isAnswered) {
      return `${baseClasses} border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-600 cursor-pointer`;
    }

    const isSelected = selectedOptionId === optionId;
    const option = question.options.find(opt => opt.id === optionId);

    if (isSelected) {
      if (option?.isCorrect) {
        return `${baseClasses} border-emerald-500 bg-emerald-500/10 text-emerald-200`;
      } else {
        return `${baseClasses} border-red-500 bg-red-500/10 text-red-200`;
      }
    }

    if (option?.isCorrect && (hasSubmitted || isAnswered)) {
      return `${baseClasses} border-emerald-500 bg-emerald-500/10 text-emerald-200`;
    }

    return `${baseClasses} border-slate-700 bg-slate-900/30 opacity-60`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-sm text-slate-400 mb-2">
          Question {questionNumber} of {totalQuestions}
        </div>
        <h2 className="text-xl font-semibold text-slate-100 leading-relaxed">
          {question.prompt}
        </h2>
      </div>

      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleOptionClick(option.id)}
            className={getOptionClassName(option.id)}
            disabled={hasSubmitted || isAnswered}
          >
            <div className="flex items-center justify-between">
              <span>{option.text}</span>
              {(hasSubmitted || isAnswered) && (
                <span className="ml-2">
                  {option.isCorrect ? (
                    <span className="text-emerald-400">✓</span>
                  ) : selectedOptionId === option.id ? (
                    <span className="text-red-400">✗</span>
                  ) : null}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {!hasSubmitted && !isAnswered && selectedOptionId && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-emerald-500 text-slate-950 font-semibold rounded-lg shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200"
          >
            Submit Answer
          </button>
        </div>
      )}

      {(hasSubmitted || isAnswered) && (
        <div className="text-center">
          <div className="text-sm text-slate-400">
            {question.options.find(opt => opt.id === selectedOptionId)?.isCorrect
              ? "Correct! 🎉"
              : "Not quite right"}
          </div>
        </div>
      )}
    </div>
  );
}
