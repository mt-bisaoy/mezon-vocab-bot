     const db = require('../db');

const addWord = async (userId, word, meaning, example) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    let wordResult = await client.query('SELECT id FROM words WHERE word = $1', [word.toLowerCase()]);
    let wordId;

    if (wordResult.rows.length > 0) {
      wordId = wordResult.rows[0].id;
    } else {
      const newWordResult = await client.query(
        'INSERT INTO words (word, meaning, example, added_by) VALUES ($1, $2, $3, $4) RETURNING id',
        [word.toLowerCase(), meaning, example, userId]
      );
      wordId = newWordResult.rows[0].id;
    }

    await client.query(
      'INSERT INTO user_words (user_id, word_id) VALUES ($1, $2) ON CONFLICT (user_id, word_id) DO NOTHING',
      [userId, wordId]
    );

    await client.query('COMMIT');
    return { word, meaning, example };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const listWords = async (userId) => {
  const result = await db.query(
    `SELECT w.word, w.meaning FROM user_words uw
     JOIN words w ON uw.word_id = w.id
     WHERE uw.user_id = $1 ORDER BY w.created_at DESC`,
    [userId]
  );
  return result.rows;
};

// Hàm này lấy một từ để người dùng ôn tập, ưu tiên các từ cần review nhất
const getReviewWord = async (userId) => {
    const result = await db.query(
        `SELECT w.id, w.word, w.meaning, w.example, uw.review_level
         FROM user_words uw
         JOIN words w ON uw.word_id = w.id
         WHERE uw.user_id = $1 AND uw.next_review_at <= NOW()
         ORDER BY uw.next_review_at ASC
         LIMIT 1`,
        [userId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
};

// Hàm cập nhật tiến độ sau khi người dùng trả lời ôn tập
const updateReviewProgress = async (userId, wordId, isCorrect) => {
    const currentProgress = await db.query(
        'SELECT review_level, correct_count, incorrect_count FROM user_words WHERE user_id = $1 AND word_id = $2',
        [userId, wordId]
    );

    let { review_level, correct_count, incorrect_count } = currentProgress.rows[0];
    let nextReviewInterval;

    if (isCorrect) {
        review_level++;
        correct_count++;
        // Spaced Repetition Intervals (1, 2, 4, 8, 16... ngày)
        const days = Math.pow(2, review_level > 0 ? review_level - 1 : 0);
        nextReviewInterval = `${days} days`;
    } else {
        review_level = Math.max(0, review_level - 1); // Giảm level nhưng không xuống dưới 0
        incorrect_count++;
        nextReviewInterval = '1 hour'; // Bắt ôn lại sau 1 tiếng
    }

    await db.query(
        `UPDATE user_words 
         SET review_level = $1, correct_count = $2, incorrect_count = $3, next_review_at = NOW() + INTERVAL '${nextReviewInterval}'
         WHERE user_id = $4 AND word_id = $5`,
        [review_level, correct_count, incorrect_count, userId, wordId]
    );
};

module.exports = { addWord, listWords, getReviewWord, updateReviewProgress };
