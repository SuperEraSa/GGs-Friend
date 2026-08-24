// api/history.js
// Returns the saved conversation log as JSON. Protected by ADMIN_PASSCODE —
// a separate passcode from GG's, known only to whoever deployed this.

const { Redis } = require('@upstash/redis');

const LOG_KEY = 'ggs-friend:log';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const required = process.env.ADMIN_PASSCODE;
  if (!required) {
    res.status(500).json({ error: 'ADMIN_PASSCODE is not set on the server.' });
    return;
  }
  const provided = req.headers['x-admin-passcode'];
  if (!provided || provided !== required) {
    res.status(401).json({ error: "That passcode didn't match." });
    return;
  }

  const url = process.env.REDIS_KV_REST_API_URL;
  const token = process.env.REDIS_KV_REST_API_TOKEN;
  if (!url || !token) {
    res.status(500).json({ error: 'The log database is not connected yet.' });
    return;
  }

  try {
    const redis = new Redis({ url: url, token: token });
    const raw = await redis.lrange(LOG_KEY, 0, -1);
    const entries = raw
      .map(function (item) {
        try {
          // Values may come back already parsed (object) or as a JSON string,
          // depending on the client version — handle both.
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // newest first

    res.status(200).json({ entries: entries });
  } catch (err) {
    console.error('Failed to read log', err);
    res.status(500).json({ error: 'Could not load the log right now.' });
  }
};
