import { useState, useCallback } from "react";
import type { QuizData, QuizState, QuizAnswer, QuizResults } from "../types/quiz";

export function useQuiz() {
  const [quizState, setQuizState] = useState<QuizState>("loading");
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateQuiz = useCallback(async () => {
    setQuizState("loading");
    setError(null);

    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate quiz: ${response.status}`);
      }

      const data: QuizData = await response.json();
      setQuizData(data);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setQuizState("playing");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setQuizState("error");
    }
  }, []);

  const answerQuestion = useCallback((answer: QuizAnswer) => {
    setAnswers(prev => [...prev, answer]);

    // Auto-advance to next question after a short delay
    setTimeout(() => {
      if (quizData && currentQuestionIndex < quizData.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setQuizState("completed");
      }
    }, 1500); // Show answer feedback for 1.5 seconds
  }, [quizData, currentQuestionIndex]);

  const resetQuiz = useCallback(() => {
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setError(null);
    generateQuiz();
  }, [generateQuiz]);

  const getCurrentQuestion = () => {
    if (!quizData || currentQuestionIndex >= quizData.questions.length) {
      return null;
    }
    return quizData.questions[currentQuestionIndex];
  };

  const getScore = () => {
    return answers.filter(answer => answer.isCorrect).length;
  };

  const getResults = (): QuizResults | null => {
    if (quizState !== "completed" || !quizData) {
      return null;
    }

    return {
      score: getScore(),
      totalQuestions: quizData.questions.length,
      answers,
      quizData
    };
  };

  const isAnswered = (questionId: string) => {
    return answers.some(answer => answer.questionId === questionId);
  };

  return {
    // State
    quizState,
    quizData,
    currentQuestionIndex,
    answers,
    error,

    // Computed values
    currentQuestion: getCurrentQuestion(),
    score: getScore(),
    totalQuestions: quizData?.questions.length ?? 0,
    results: getResults(),
    isAnswered,

    // Actions
    generateQuiz,
    answerQuestion,
    resetQuiz
  };
}
