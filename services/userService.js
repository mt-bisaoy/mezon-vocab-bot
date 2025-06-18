// file: services/userService.js
const db = require('../db');

/**
 * Tìm một người dùng bằng Mezon ID, nếu không có thì tạo mới.
 * Hàm này không cần client nữa.
 * @param {string} mezonId - ID người dùng từ Mezon.
 * @returns {object} Thông tin người dùng từ CSDL.
 */
const findOrCreateUser = async (mezonId) => {
  // 1. Thử tìm người dùng trong CSDL trước
  let userResult = await db.query('SELECT * FROM users WHERE mezon_id = $1', [mezonId]);
  if (userResult.rows.length > 0) {
    return userResult.rows[0];
  }

  // 2. Nếu không có, tạo người dùng mới với username là null (sẽ cập nhật sau nếu cần)
  userResult = await db.query(
    'INSERT INTO users (mezon_id, username) VALUES ($1, $2) RETURNING *',
    [mezonId, null] // Username có thể là null, không sao cả
  );
  console.log(`New user record created for mezon_id: ${mezonId}`);
  return userResult.rows[0];
};

module.exports = { findOrCreateUser };