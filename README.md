# GG's Friend

A calm, glassmorphic chat companion for GG, backed by Claude. This folder is a
complete, ready-to-deploy web app: a frontend (`index.html`) and a tiny
backend (`api/chat.js`, `api/verify.js`) that holds your Anthropic API key
safely on the server — it's never visible to anyone using the link.

## What's inside

- `index.html` — the chat UI. Soothing glass design, chat bubbles, typing
  indicator, welcome message. Sends the full conversation on every message
  so GG's Friend remembers what was said earlier in the session.
- `api/chat.js` — receives the conversation from the browser, adds GG's
  hidden persona, calls Claude, sends back the reply. The persona and your
  API key live only here, server-side.
- `api/verify.js` — checks the optional passcode without spending an API call.
- `.env.example` — the two environment variables you'll set on your host.

## 1. Get an Anthropic API key

Go to [console.anthropic.com](https://console.anthropic.com/settings/keys),
sign in, and create an API key. Copy it somewhere safe — you'll paste it into
your hosting provider in a minute, not into any file here.

Also worth doing: open Anthropic's docs and confirm the exact current model
ID. This app is set to `claude-sonnet-4-6` (in `api/chat.js`, near the top).
Model names change over time — if the app errors out after deploying, this
is the first thing to check.

## 2. Deploy to Vercel (free)

Vercel is the easiest fit for this project — no config needed, it detects
the `api/` folder automatically.

**Option A — from your computer, using the Vercel CLI:**

1. Install Node.js if you don't have it ([nodejs.org](https://nodejs.org)).
2. Open a terminal in this folder.
3. Run:
   ```
   npm install -g vercel
   vercel
   ```
4. Follow the prompts (log in / sign up when asked — free account is fine).
   When it asks about settings, the defaults are fine — just confirm.
5. Vercel gives you a live URL. That's the app, live on the web.

**Option B — no terminal, using GitHub:**

1. Push this folder to a new GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new), sign in, and import that
   repository.
3. Leave the build settings as default and click **Deploy**.

Either way, don't chat with it yet — it needs its API key first.

## 3. Add your environment variables

In the Vercel dashboard: open your project → **Settings** →
**Environment Variables**, and add:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | the key you copied in step 1 |
| `ACCESS_PASSCODE` | a passcode GG will type to open the app (optional, but recommended — see below) |

Then go to the **Deployments** tab and **redeploy** so the new variables
take effect.

### Why the passcode

The link is public — anyone who gets it, or stumbles on it, could open it
and start chatting, and every message costs a little on your API bill.
Setting `ACCESS_PASSCODE` puts a simple gate in front of the app: GG enters
the passcode once per browser session, and it's checked on the server, not
just the screen. Leave it blank if you'd rather skip this.

## 4. Try it

Open the URL Vercel gave you. Enter the passcode if you set one, then send
a message. If something's wrong, check the **Logs** tab in your Vercel
project — it'll show the actual error (most often: a typo'd env variable
name, or a model ID that needs updating).

## 5. Share it with GG

Send her the URL (and the passcode, separately, if you set one). That's it
— it's a normal web page, works on phone or desktop, nothing to install.

## Notes on cost and safety

- Every message GG sends is a real API call, billed on your Anthropic
  account. `claude-sonnet-4-6` at `max_tokens: 1000` is inexpensive per
  message, but keep an eye on usage if the link gets shared further than
  intended.
- The backend keeps only the last 40 messages of history per request, so a
  very long conversation doesn't grow the cost unbounded.
- Chat history is stored in GG's own browser (`localStorage`) so it
  survives a page refresh, but it's local to her device — clearing browser
  data clears it. Nothing is stored on the server.

## Customizing

- **Persona / system prompt** — edit the `SYSTEM_PROMPT` constant at the top
  of `api/chat.js`.
- **Colors / design** — all the CSS custom properties are at the top of the
  `<style>` block in `index.html` (`--accent`, `--bg-a`, etc.), with a
  separate set for dark mode right below.
- **Welcome message** — the `WELCOME` constant near the top of the `<script>`
  block in `index.html`.
- **Model / token limit** — `MODEL` and `MAX_TOKENS` in `api/chat.js`.
