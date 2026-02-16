const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'typo-secret-change-me';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await sql`
      INSERT INTO users (username, password_hash) VALUES (${username}, ${hash}) RETURNING id
    `;

    const token = jwt.sign({ id: result.rows[0].id, username }, SECRET, { expiresIn: '30d' });

    res.status(201).json({ ok: true, token, username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
