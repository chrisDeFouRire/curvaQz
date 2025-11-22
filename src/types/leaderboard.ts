export type LeaderboardEntry = {
  rank: number;
  nickname: string;
  score: number;
  totalQuestions: number;
  isMe: boolean;
};

export type LeaderboardTopResponse = {
  quizId: string;
  totalPlayers: number;
  entries: LeaderboardEntry[];
};

export type LeaderboardMeResponse = {
  quizId: string;
  totalPlayers: number;
  player: LeaderboardEntry;
  top: LeaderboardEntry[];
  around: LeaderboardEntry[];
  bottom: LeaderboardEntry[];
};

export type SubmitScoreResponse = {
  quizId: string;
  totalPlayers: number;
  entry: LeaderboardEntry | null;
};
