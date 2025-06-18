    const db = require('../db');

const findOrCreateUser = async (mezonId, username) => {
  let userResult = await db.query('SELECT * FROM users WHERE mezon_id = $1', [mezonId]);
  if (userResult.rows.length > 0) {
    return userResult.rows[0];
  }
  userResult = await db.query(
    'INSERT INTO users (mezon_id, username) VALUES ($1, $2) RETURNING *',
    [mezonId, username]
  );
  console.log(`New user created: ${username} (${mezonId})`);
  return userResult.rows[0];
};

module.exports = { findOrCreateUser };
   
