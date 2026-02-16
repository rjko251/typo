const { sql } = require('@vercel/postgres');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'typo-secret-change-me';

function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), SECRET);
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  const user = getUser(req);

  // POST = save a score
  if (req.method === 'POST') {
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { wpm, accuracy, errors, gameMode, modeValue, duration } = req.body;

    if (!wpm || !accuracy || !gameMode || !modeValue || !duration) {
      return res.status(400).json({ error: 'Missing score data' });
    }

    try {
      await sql`
        INSERT INTO scores (user_id, wpm, accuracy, errors, game_mode, mode_value, duration)
        VALUES (${user.id}, ${wpm}, ${accuracy}, ${errors || 0}, ${gameMode}, ${modeValue}, ${duration})
      `;
      res.status(201).json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // GET = fetch scores
  if (req.method === 'GET') {
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    try {
      // Personal best per mode
      const bests = await sql`
        SELECT game_mode, mode_value, MAX(wpm) as best_wpm, MAX(accuracy) as best_acc, COUNT(*) as tests
        FROM scores WHERE user_id = ${user.id}
        GROUP BY game_mode, mode_value
        ORDER BY game_mode, mode_value
      `;

      // Recent 20 scores
      const recent = await sql`
        SELECT wpm, accuracy, errors, game_mode, mode_value, duration, created_at
        FROM scores WHERE user_id = ${user.id}
        ORDER BY created_at DESC LIMIT 20
      `;

      // Overall stats
      const overall = await sql`
        SELECT COUNT(*) as total_tests, 
               ROUND(AVG(wpm)) as avg_wpm, 
               MAX(wpm) as best_wpm,
               ROUND(AVG(accuracy)) as avg_acc
        FROM scores WHERE user_id = ${user.id}
      `;

      res.status(200).json({
        ok: true,
        bests: bests.rows,
        recent: recent.rows,
        overall: overall.rows[0]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
