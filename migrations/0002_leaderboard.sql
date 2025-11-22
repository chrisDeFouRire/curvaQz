-- D1 migration: quiz instances + leaderboard entries

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NULL,
  source TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  metadata TEXT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quiz_leaderboard_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id TEXT NOT NULL,
  player_key TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NULL,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_leaderboard_unique_player ON quiz_leaderboard_entries(quiz_id, player_key);
CREATE INDEX IF NOT EXISTS idx_quiz_leaderboard_score ON quiz_leaderboard_entries(quiz_id, score DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_quizzes_source ON quizzes(source);
