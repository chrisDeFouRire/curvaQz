// Shared types for quiz UI components
export type QuizMode = "mock" | "live";

export type QuizOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
};

export type QuizData = {
  quizId: string;
  sessionId: string;
  source: QuizMode;
  metadata?: Record<string, unknown>;
  questions: QuizQuestion[];
};

export type QuizState = "loading" | "playing" | "completed" | "error";

export type QuizAnswer = {
  questionId: string;
  optionId: string;
  isCorrect: boolean;
};

export type QuizResults = {
  score: number;
  totalQuestions: number;
  answers: QuizAnswer[];
  quizData: QuizData;
};
