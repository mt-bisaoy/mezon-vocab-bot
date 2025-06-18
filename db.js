    const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const query = (text, params) => pool.query(text, params);

const initDatabase = async () => {
  try {
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          mezon_id VARCHAR(255) NOT NULL UNIQUE,
          username VARCHAR(255),
          daily_vocab_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS words (
          id SERIAL PRIMARY KEY,
          word TEXT NOT NULL UNIQUE,
          meaning TEXT NOT NULL,
          example TEXT,
          added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_words (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
          is_learned BOOLEAN DEFAULT false,
          review_level INTEGER DEFAULT 0,
          next_review_at TIMESTAMPTZ DEFAULT NOW(),
          correct_count INTEGER DEFAULT 0,
          incorrect_count INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, word_id)
      );
    `;
    await query(createTablesQuery);
    console.log("Database tables are ready.");
  } catch (err) {
    console.error("Error initializing database tables:", err);
    // Nếu lỗi không phải do bảng đã tồn tại, thì dừng chương trình
    if (err.code !== '42P07') {
      process.exit(1);
    }
  }
};

module.exports = { query, pool, initDatabase };
