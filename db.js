    const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, // Quan trọng nếu dùng Railway cloud
  },
});

const query = (text, params) => pool.query(text, params);

/**
 * Hàm khởi tạo toàn bộ cấu trúc CSDL
 */
const initDatabase = async () => {
  try {
    const createTablesQuery = `
      -- Bảng người dùng
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          mezon_id VARCHAR(255) NOT NULL UNIQUE,
          username VARCHAR(255),
          nickname VARCHAR(50), -- Tên gọi thân mật
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Bảng từ vựng chung
      CREATE TABLE IF NOT EXISTS words (
          id SERIAL PRIMARY KEY,
          word TEXT NOT NULL UNIQUE,
          meaning TEXT NOT NULL,
          example TEXT,
          added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Bảng tiến độ học của người dùng
      CREATE TABLE IF NOT EXISTS user_words (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
          source VARCHAR(50) DEFAULT 'user', -- 'user' hoặc 'bot'
          is_learned BOOLEAN DEFAULT false,
          review_level INTEGER DEFAULT 0,
          next_review_at TIMESTAMPTZ DEFAULT NOW(),
          correct_count INTEGER DEFAULT 0,
          incorrect_count INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, word_id)
      );
      
      -- Bảng từ vựng có sẵn cho bot
      CREATE TABLE IF NOT EXISTS general_words (
          id SERIAL PRIMARY KEY,
          word TEXT NOT NULL UNIQUE,
          meaning TEXT NOT NULL,
          example TEXT
      );
    `;
    
    await query(createTablesQuery);
    console.log("Database tables are ready.");

    // Thêm dữ liệu mẫu cho bot "học" nếu bảng `general_words` trống
    await seedGeneralWords();

  } catch (err) {
    console.error("Error initializing database:", err);
    // Nếu lỗi không phải do bảng đã tồn tại, thì dừng chương trình
    if (err.code !== '42P07') {
      process.exit(1);
    }
  }
};

/**
 * Hàm thêm dữ liệu mẫu vào bảng general_words
 */
const seedGeneralWords = async () => {
    const res = await query('SELECT COUNT(*) FROM general_words');
    if (res.rows[0].count > 0) {
        // console.log('General words already seeded.');
        return; // Đã có dữ liệu, không cần thêm
    }

    console.log('Seeding general words for the bot...');
    const sampleWords = [
        { word: 'diligent', meaning: 'chăm chỉ, siêng năng', example: 'His diligent efforts paid off in the end.' },
        { word: 'ephemeral', meaning: 'phù du, chóng tàn', example: 'Fashion is by nature ephemeral.' },
        { word: 'ubiquitous', meaning: 'phổ biến, ở đâu cũng có', example: 'Coffee shops are ubiquitous these days.' },
        { word: 'serendipity', meaning: 'sự tình cờ may mắn', example: 'Finding that old book was a moment of pure serendipity.' },
        { word: 'eloquent', meaning: 'hùng hồn, có tài hùng biện', example: 'She made an eloquent plea for peace.' },
        { word: 'resilience', meaning: 'sự kiên cường, khả năng phục hồi', example: 'The resilience of the human spirit is amazing.' },
        { word: 'benevolent', meaning: 'nhân từ, rộng lượng', example: 'He was a benevolent old man and wouldn’t hurt a fly.' },
        { word: 'pragmatic', meaning: 'thực dụng', example: 'We need to take a pragmatic approach to this problem.' },
        { word: 'ambiguous', meaning: 'mơ hồ, không rõ ràng', example: 'The instructions were ambiguous and difficult to follow.' },
        { word: 'nostalgia', meaning: 'nỗi nhớ nhà, lòng hoài cổ', example: 'Listening to that song filled me with nostalgia for my childhood.' }
    ];

    const insertQuery = 'INSERT INTO general_words (word, meaning, example) VALUES ($1, $2, $3) ON CONFLICT (word) DO NOTHING';
    
    // Dùng Promise.all để chạy các câu lệnh insert song song
    await Promise.all(sampleWords.map(w => query(insertQuery, [w.word, w.meaning, w.example])));

    console.log('Finished seeding general words.');
};


module.exports = { 
  query, 
  pool, // Export pool để dùng cho transaction trong service
  initDatabase 
};
