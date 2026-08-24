// api/chat.js
// Serverless function (Vercel Node.js runtime) that proxies chat messages to
// the Anthropic API. The API key and GG's persona stay on the server —
// neither is ever sent to the browser.

const { Redis } = require('@upstash/redis');

const SYSTEM_PROMPT = `You are GG's friendly assistant. You help her with all her questions from the world to fiction to her emotions and concerns
You are warm, clear, very patient and practical, and you always end with one helpful next step.`;

const MODEL = 'claude-sonnet-5'; // confirmed against platform.claude.com/docs, Aug 2026
const MAX_TOKENS = 1000;
const MAX_HISTORY_MESSAGES = 40; // keep recent context only, bounds cost per request
const MAX_MESSAGE_CHARS = 6000;
const LOG_KEY = 'ggs-friend:log';
const LOG_MAX_ENTRIES = 500; // keep the log from growing forever

function checkPasscode(req, res) {
  const required = process.env.ACCESS_PASSCODE;
  if (!required) return true; // no passcode configured -> gate disabled
  const provided = req.headers['x-ggs-passcode'];
  if (provided && provided === required) return true;
  res.status(401).json({ error: "That passcode didn't match." });
  return false;
}

// Saves each exchange to Redis so it can be read later from /history.html.
// GG knows this is on. Fully optional — if the Redis env vars aren't set,
// this silently does nothing, and a failure here never breaks the chat.
async function logExchange(userMessage, reply) {
  const url = process.env.REDIS_KV_REST_API_URL;
  const token = process.env.REDIS_KV_REST_API_TOKEN;
  if (!url || !token) return;

  try {
    const redis = new Redis({ url: url, token: token });
    await redis.rpush(LOG_KEY, JSON.stringify({
      at: new Date().toISOString(),
      message: userMessage,
      reply: reply
    }));
    await redis.ltrim(LOG_KEY, -LOG_MAX_ENTRIES, -1);
  } catch (err) {
    console.error('Failed to write log entry', err);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!checkPasscode(req, res)) return;

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server is missing its API key. Ask whoever deployed this to set ANTHROPIC_API_KEY.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const messages = Array.isArray(body && body.messages) ? body.messages : [];

  const cleaned = messages
    .filter(function (m) {
      return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0;
    })
    .slice(-MAX_HISTORY_MESSAGES)
    .map(function (m) {
      return { role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) };
    });

  if (cleaned.length === 0) {
    res.status(400).json({ error: 'No message to send.' });
    return;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: cleaned
      })
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Anthropic API error', upstream.status, errText);
      res.status(502).json({ error: "GG's Friend is having trouble reaching Claude right now. Try again in a moment." });
      return;
    }

    const data = await upstream.json();
    const block = Array.isArray(data.content) ? data.content.find(function (b) { return b.type === 'text'; }) : null;
    const reply = block && block.text ? block.text : "I'm here, but I couldn't quite form a reply. Could you try that again?";

    const lastUserMessage = cleaned[cleaned.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await logExchange(lastUserMessage.content, reply);
    }

    res.status(200).json({ reply: reply });
  } catch (err) {
    console.error('Server error calling Anthropic', err);
    res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
  }
};
