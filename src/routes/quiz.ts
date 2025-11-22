import type { Handler } from "hono";
import { getQuizByLatestFixture, type QzApiConfig } from "../lib/qz-api";
import type { WorkerEnv } from "../types/worker";
import { ensureSession } from "./session";
import mockQuiz from "../../mockup/quizz.json";
import { recordQuiz } from "../lib/leaderboard";

type QuizMode = "mock" | "live";

type RawQuestion = {
  question?: string;
  prompt?: string;
  answers?: Array<string | { text?: string; isCorrect?: boolean; correct?: boolean }>;
  options?: Array<string | { text?: string; isCorrect?: boolean; correct?: boolean }>;
  correct_answer?: string;
  incorrect_answers?: string[];
  correctAnswer?: string;
  incorrectAnswers?: string[];
};

type RawQuiz = {
  questions: RawQuestion[];
  metadata?: Record<string, unknown>;
};

type LiveQuizResponse = {
  questions?: RawQuestion[];
  fixture?: Record<string, unknown>;
  quizId?: string | number;
  [key: string]: unknown;
};

type NormalizedOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type NormalizedQuestion = {
  id: string;
  prompt: string;
  options: NormalizedOption[];
};

type NormalizedQuiz = {
  quizId: string;
  sessionId: string;
  source: QuizMode;
  metadata?: Record<string, unknown>;
  questions: NormalizedQuestion[];
};

const DEFAULT_QUESTION_COUNT = 5;
const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 10;

function clampQuestionCount(value?: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_QUESTION_COUNT;
  }
  return Math.min(MAX_QUESTION_COUNT, Math.max(MIN_QUESTION_COUNT, Math.floor(parsed)));
}

function shuffle<T>(items: T[], randomFn: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toText(answer: string | { text?: string } | undefined): string | null {
  if (typeof answer === "string") return answer;
  if (answer && typeof answer.text === "string") return answer.text;
  return null;
}

function toOptionCandidates(question: RawQuestion): Array<{ text: string; isCorrect: boolean }> {
  const candidates: Array<{ text: string; isCorrect: boolean }> = [];

  const answers = question.answers ?? question.options;
  if (Array.isArray(answers) && answers.length > 0) {
    answers.forEach((answer, index) => {
      const text = toText(answer);
      if (!text) return;
      const isCorrect = typeof answer === "object" && answer
        ? Boolean(answer.isCorrect ?? answer.correct)
        : index === 0;
      candidates.push({ text, isCorrect });
    });
  }

  const correct = question.correct_answer ?? question.correctAnswer;
  const incorrect = question.incorrect_answers ?? question.incorrectAnswers;
  if (typeof correct === "string" && Array.isArray(incorrect) && incorrect.length > 0) {
    candidates.push({ text: correct, isCorrect: true });
    incorrect.forEach((text) => {
      candidates.push({ text, isCorrect: false });
    });
  }

  return candidates;
}

function normalizeQuestion(question: RawQuestion): NormalizedQuestion | null {
  const prompt = question.question ?? question.prompt;
  const options = shuffle(
    toOptionCandidates(question).map((option) => ({
      id: crypto.randomUUID(),
      text: option.text,
      isCorrect: option.isCorrect
    }))
  );

  if (!prompt || options.length === 0) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    prompt,
    options
  };
}

function normalizeQuiz(
  quiz: RawQuiz,
  targetLength: number,
  sessionId: string,
  source: QuizMode,
  quizId: string
): NormalizedQuiz {
  const normalizedQuestions = quiz.questions
    .map((question) => normalizeQuestion(question))
    .filter((value): value is NormalizedQuestion => Boolean(value));

  const limited = normalizedQuestions.slice(0, clampQuestionCount(targetLength));
  if (limited.length === 0) {
    throw new Error("Quiz data did not contain any questions");
  }

  const metadata = quiz.metadata && Object.keys(quiz.metadata).length > 0 ? quiz.metadata : undefined;

  return {
    quizId,
    sessionId,
    source,
    metadata,
    questions: limited
  };
}

function resolveQuizMode(env: WorkerEnv): QuizMode {
  return env.QUIZ_MODE === "live" ? "live" : "mock";
}

function loadMockQuiz(targetLength: number): RawQuiz {
  const questions = shuffle(mockQuiz as RawQuestion[]).slice(0, clampQuestionCount(targetLength));
  return { questions };
}

async function loadLiveQuiz(env: WorkerEnv, targetLength: number): Promise<RawQuiz> {
  const leagueId = env.QUIZ_LEAGUE_ID;
  if (!leagueId) {
    throw new Error("QUIZ_LEAGUE_ID is not configured for live quiz mode");
  }

  const config: QzApiConfig = {
    baseUrl: env.QUIZ_API_BASE,
    authToken: env.QUIZ_API_AUTH
  };

  const response = await getQuizByLatestFixture<LiveQuizResponse>(
    {
      leagueId,
      length: clampQuestionCount(targetLength),
      nbAnswers: 4,
      distinct: 1,
      shuffle: 1
    },
    config
  );

  const questions = Array.isArray(response.questions) ? response.questions : [];
  const metadata = response.fixture ? { fixture: response.fixture } : undefined;

  return { questions, metadata };
}

export const handleGenerateQuiz: Handler<{ Bindings: WorkerEnv }> = async (c) => {
  const sessionResult = await ensureSession(c, { createIfMissing: true, replaceRevoked: false });
  if (sessionResult.type === "error") {
    console.error("quiz.generate.session", { message: "Invalid or missing session" });
    return sessionResult.response;
  }

  const targetLength = clampQuestionCount(c.env.QUIZ_LENGTH);
  const mode = resolveQuizMode(c.env);

  try {
    const quizId = crypto.randomUUID();
    const rawQuiz = mode === "mock" ? loadMockQuiz(targetLength) : await loadLiveQuiz(c.env, targetLength);
    const normalized = normalizeQuiz(rawQuiz, targetLength, sessionResult.value.session.id, mode, quizId);

    await recordQuiz(c.env.DB, {
      id: quizId,
      sessionId: sessionResult.value.session.id,
      userId: sessionResult.value.session.user_id,
      source: mode,
      questionCount: normalized.questions.length,
      metadata: normalized.metadata ?? null
    });

    return c.json(normalized);
  } catch (error) {
    console.error("quiz.generate.failed", {
      mode,
      message: error instanceof Error ? error.message : String(error)
    });
    const status = mode === "live" ? 502 : 500;
    return c.json({ error: "Failed to generate quiz" }, status);
  }
};
