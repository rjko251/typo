const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(32) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        wpm INTEGER NOT NULL,
        accuracy INTEGER NOT NULL,
        errors INTEGER NOT NULL,
        game_mode VARCHAR(10) NOT NULL,
        mode_value INTEGER NOT NULL,
        duration REAL NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    res.status(200).json({ ok: true, message: 'Tables created' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};
