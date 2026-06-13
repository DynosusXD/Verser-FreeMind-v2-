# Freestyle Coach

An AI-powered word prompt tool for freestyle rap practice. A small backend asks
an AI model for a batch of mood/tempo-matched words, and the frontend flashes
them one at a time in sync with a BPM you set.

## Project files

```
freestyle-coach/
├── index.html     # Frontend (open with VS Code Live Server)
├── server.js      # Backend (run with Node)
├── package.json
└── .env           # Your NVIDIA API key goes here
```

## 1. Set up the backend

**No `npm install` needed** — the server only uses Node's built-in modules
(`http`, plus the global `fetch`/`AbortController` that ship with Node 18+),
so there's nothing to download and no `node_modules` folder.

1. Open a terminal in this folder.
2. Open `.env` and replace `YOUR_NVIDIA_API_KEY_HERE` with your real NVIDIA API key:

   ```
   NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxx
   PORT=3000
   ```

3. Start the server:

   ```bash
   node server.js
   ```

   You should see:

   ```
   Server is running on http://localhost:3000
   ```

**Keep this terminal running** while you use the app — the frontend talks to it.

## Checking it's working

You can check this in layers, without needing the backend at all to start:

1. **Frontend only (no backend running)**: open `index.html` with Live Server
   and click **Start Session**. The countdown should play, words should flash
   on the beat, and you'll see a toast: *"Couldn't reach the AI coach —
   practicing with the offline word bank."* This confirms the UI, timing,
   pause/skip/end, sound, and stats all work on their own.

2. **Backend health check**: run `node server.js`, then open
   `http://localhost:3000/health` in a browser tab — it should show
   `{"status":"ok"}`. If the page won't load, the server isn't running or
   something else is using port 3000.

3. **Full AI integration**: with the backend running *and* a real API key in
   `.env`, click **Start Session** again. If everything's wired up correctly,
   the toast won't appear and the words should feel tailored to the mood/tempo
   you picked (instead of the generic offline word bank). Check the terminal
   running `server.js` for any error logs if it still falls back.

## 2. Run the frontend

With the backend still running, open `index.html` in VS Code and click
**Go Live** (Live Server). It opens at something like
`http://127.0.0.1:5500/index.html`. CORS is already enabled on the backend, so
it can call `http://localhost:3000` from there with no extra config.

## How to use it

1. Pick a mood (tap a chip or type your own) and a tempo.
2. **Tempo** is set as **BPM** + a **rate**:
   - Rapid = 1 beat per word
   - Quick = 2 beats per word
   - Classic = 4 beats per word (default, ~3.2s at 75 BPM)
   - Chill = 8 beats per word
   - Use **TAP TEMPO** to set the BPM by tapping along to a beat.
3. Hit **Start Session** — a 3-2-1-GO countdown plays, then words start flashing.
4. While live:
   - `Space` — pause / resume
   - `→` — skip to the next word
   - `Esc` — end the session and see your stats
5. The app automatically fetches more words in the background before the
   queue runs out, so sessions can run continuously.

## Notes / troubleshooting

- **"Couldn't reach the AI coach" toast**: the frontend couldn't reach
  `http://localhost:3000`. Make sure the backend terminal is still running
  and shows no errors. The session will still work using a built-in offline
  word bank.
- **500 error / "NVIDIA_API_KEY is not set"**: edit `.env` with your real key
  and restart the backend (`Ctrl+C` then `node server.js`).
- **Model errors in the backend logs**: the backend requests the model
  `deepseek-ai/deepseek-v4-pro` from NVIDIA's API. If your account doesn't
  have access to that exact model ID, check the
  [NVIDIA NIM model catalog](https://build.nvidia.com/models) for an
  available chat model and update the `model` field in `server.js`.
- **Sound doesn't play on first click**: browsers require a user gesture
  before audio can start — this is handled automatically when you press
  **Start Session**.

## License

MIT — see [LICENSE](LICENSE).
