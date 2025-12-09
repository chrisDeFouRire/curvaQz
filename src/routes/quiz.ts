import type { Handler } from "hono";
import { getLeagues, getQuizByLatestFixture, type QuizQuestion } from "../lib/qz-api";
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

type StoredQuizPayload = {
  quizId: string;
  source: QuizMode;
  metadata?: Record<string, unknown>;
  questions: NormalizedQuestion[];
};

function parseQuizLength(env: WorkerEnv): number {
  const value = env.QUIZ_LENGTH;
  if (value === undefined) {
    throw new Error("QUIZ_LENGTH environment variable is required");
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`QUIZ_LENGTH must be a positive number, got: ${value}`);
  }
  return Math.floor(parsed);
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

  const limited = normalizedQuestions.slice(0, targetLength);
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

function toStoredPayload(normalized: NormalizedQuiz): StoredQuizPayload {
  const { quizId, source, metadata, questions } = normalized;
  return { quizId, source, metadata, questions };
}

function parseStoredPayload(payload: unknown): StoredQuizPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const base = payload as Record<string, unknown>;
  if (typeof base.quizId !== "string") return null;
  if (base.source !== "mock" && base.source !== "live") return null;
  if (!Array.isArray(base.questions)) return null;

  const questions: NormalizedQuestion[] = [];
  for (const q of base.questions) {
    if (!q || typeof q !== "object") return null;
    const item = q as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.prompt !== "string" || !Array.isArray(item.options)) {
      return null;
    }
    const options: NormalizedOption[] = [];
    for (const opt of item.options) {
      if (!opt || typeof opt !== "object") return null;
      const optItem = opt as Record<string, unknown>;
      if (typeof optItem.id !== "string" || typeof optItem.text !== "string" || typeof optItem.isCorrect !== "boolean") {
        return null;
      }
      options.push({
        id: optItem.id,
        text: optItem.text,
        isCorrect: optItem.isCorrect
      });
    }
    questions.push({
      id: item.id,
      prompt: item.prompt,
      options
    });
  }

  const metadata = base.metadata && typeof base.metadata === "object" ? (base.metadata as Record<string, unknown>) : undefined;

  return {
    quizId: base.quizId,
    source: base.source,
    metadata,
    questions
  };
}

export function buildStoredQuizPayload(normalized: NormalizedQuiz): StoredQuizPayload {
  return toStoredPayload(normalized);
}

export function reviveStoredQuizPayload(payload: unknown): StoredQuizPayload | null {
  return parseStoredPayload(payload);
}

function resolveQuizMode(env: WorkerEnv): QuizMode {
  // Default to live mode now that we have proper API typing
  return env.QUIZ_MODE === "mock" ? "mock" : "live";
}

function loadMockQuiz(targetLength: number): RawQuiz {
  const questions = shuffle(mockQuiz as RawQuestion[]).slice(0, targetLength);
  return { questions };
}

async function loadLiveQuiz(env: WorkerEnv, targetLength: number): Promise<RawQuiz> {
  if (!env.QUIZ_API_AUTH) {
    throw new Error("QUIZ_API_AUTH is not configured for live quiz mode");
  }

  // Fetch available leagues and pick one randomly
  const leagues = await getLeagues(env);
  if (leagues.length === 0) {
    throw new Error("No leagues available from QZ API");
  }

  // Try up to 5 random leagues to find one with questions
  for (let attempt = 0; attempt < 5; attempt++) {
    const randomLeague = leagues[Math.floor(Math.random() * leagues.length)];
    const leagueId = randomLeague.id; // Use numeric ID as required by API

    try {
      const response = await getQuizByLatestFixture<LiveQuizResponse>(
        {
          leagueId,
          length: targetLength,
          nbAnswers: 4,
          distinct: true,
          shuffle: true,
          lang: "en"
        },
        env
      );

      // API returns questions as object properties with numeric keys: "0", "1", "2", etc.
      const questions: RawQuestion[] = [];
      for (const key in response) {
        if (key !== 'fixture' && response[key] && typeof response[key] === 'object') {
          const questionData = response[key] as QuizQuestion;
          if (questionData.question && questionData.answers) {
            // Convert API format to our internal format
            const rawQuestion: RawQuestion = {
              question: questionData.question,
              answers: questionData.answers.map(answer => ({
                text: answer.txt,
                isCorrect: answer.type === 'OK'
              }))
            };
            questions.push(rawQuestion);
          }
        }
      }

      if (questions.length > 0) {
        const metadata = response.fixture ? { fixture: response.fixture, league: randomLeague } : { league: randomLeague };
        return { questions, metadata };
      }
    } catch (error) {
      // Continue to next attempt
    }
  }

  throw new Error("No leagues returned questions from QZ API after multiple attempts");
}

export const handleGenerateQuiz: Handler<{ Bindings: WorkerEnv }> = async (c) => {
  const sessionResult = await ensureSession(c, { createIfMissing: true, replaceRevoked: false });
  if (sessionResult.type === "error") {
    console.error("quiz.generate.session", { message: "Invalid or missing session" });
    return sessionResult.response;
  }

  const targetLength = parseQuizLength(c.env);
  const mode = resolveQuizMode(c.env);

  try {
    const quizId = crypto.randomUUID();
    let rawQuiz: RawQuiz;
    let actualMode = mode;

    if (mode === "live") {
      try {
        rawQuiz = await loadLiveQuiz(c.env, targetLength);
      } catch (liveError) {
        console.warn("quiz.generate.live_failed", {
          message: liveError instanceof Error ? liveError.message : String(liveError)
        });
        // Fall back to mock if live API fails
        rawQuiz = loadMockQuiz(targetLength);
        actualMode = "mock";
      }
    } else {
      rawQuiz = loadMockQuiz(targetLength);
    }

    const normalized = normalizeQuiz(rawQuiz, targetLength, sessionResult.value.session.id, actualMode, quizId);
    const payload = buildStoredQuizPayload(normalized);

    await recordQuiz(c.env.DB, {
      id: quizId,
      sessionId: sessionResult.value.session.id,
      userId: sessionResult.value.session.user_id,
      source: actualMode,
      questionCount: normalized.questions.length,
      metadata: normalized.metadata ?? null,
      payload
    });

    return c.json(normalized);
  } catch (error) {
    console.error("quiz.generate.failed", {
      mode,
      message: error instanceof Error ? error.message : String(error)
    });
    return c.json({ error: "Failed to generate quiz" }, 500);
  }
};
