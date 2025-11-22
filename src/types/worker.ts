export type AssetsBinding = {
  fetch: (request: Request) => Promise<Response>;
};

export type WorkerEnv = {
  DB: D1Database;
  AUTH_SECRET: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
  ASSETS?: AssetsBinding;
  QUIZ_MODE?: "mock" | "live";
  QUIZ_LEAGUE_ID?: string;
  QUIZ_LENGTH?: string;
  QUIZ_API_BASE?: string;
  QUIZ_API_AUTH?: string;
};
