// api/verify.js
// Lightweight passcode check used by the gate screen, so the app can tell
// a wrong passcode apart from a real error without spending an API call.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const required = process.env.ACCESS_PASSCODE;
  if (!required) {
    res.status(200).json({ ok: true });
    return;
  }

  const provided = req.headers['x-ggs-passcode'];
  if (provided && provided === required) {
    res.status(200).json({ ok: true });
    return;
  }

  res.status(401).json({ ok: false });
};
