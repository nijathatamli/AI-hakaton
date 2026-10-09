# PlayerOne desktop

An AI playtester. A free local model plays your game. The engine's own console reports errors. A big model, which can be Claude, Codex, Gemini or our hosted one, only reads small digests and decides what is a bug.

```
desktop/
  engine/      Rust: capture, input, console probes, recorder, model clients, session loop, MCP, accounts. Also the `playerone` CLI
  app/         Tauri 2 desktop app on top of the engine. One UI, native skin per OS
  testgame/    Godot 4 platformer with bugs we plant on purpose, for measuring the tester
  bench/       benchmark runner and results
  supabase/    account server: schema and the Stripe webhook
```

## How a playtest works

1. **Attach or launch.** PlayerOne finds the game window, or launches the game and reads its stdout and stderr.
2. **Play.** The player model gets a 640 px screenshot and returns up to four actions as JSON. Keys and clicks go through the OS, so any engine works with no SDK. With no model, the explorer bot plays instead.
3. **Watch.** Four detectors run all the time and need no model:
   - **Console errors.** Per-engine patterns for Godot, Unity, Unreal and Source 2.
   - **Crash.** The game process exits.
   - **Hang.** The window produces no frame for 4 seconds. Frames are grabbed on a worker thread with a deadline, so a hung game cannot hang PlayerOne.
   - **Soft-lock.** The screen stays still for 4 seconds while keys are pressed. PlayerOne then pauses the player and tries every movement key once, like a human tester would. If anything reacts, it was a dead end and nothing is filed. If nothing reacts, it files a soft-lock.
4. **Record.** The last 12 seconds stay in memory. When something happens, PlayerOne saves a contact sheet (9 frames in one JPEG) and a 480p, 8 fps H.264 clip.
5. **Direct.** The director gets the text digest and the contact sheets. Only Gemini gets the clip, because only Gemini takes video. It answers which incidents are real bugs, writes the reports, and gives the player its next goal.

Every session writes `session.json` with a meter: tokens the director used, and tokens a big model would have used playing the game itself, at one full-size screenshot per move.

## Run it

You need Rust and, for the app, Node 18 or newer. Install ffmpeg to get video clips, and [Ollama](https://ollama.com) to get the free local player.

```bash
cd desktop
cargo build --release -p playerone

# list windows
./target/release/playerone windows

# playtest the included test game with the soft-lock bug, local player, no director
ollama pull qwen2.5vl:3b
./target/release/playerone run --launch "godot --path testgame -- --bugs=softlock" --window Cavern \
  --engine godot --player ollama:qwen2.5vl:3b --keys left,right,space --minutes 1

# same, with Claude reading digests and writing the reports
export ANTHROPIC_API_KEY=...
./target/release/playerone run --launch "godot --path testgame -- --bugs=crash" --window Cavern \
  --engine godot --player explore --director claude --minutes 1

# desktop app
cd app && npm install && npx tauri dev
```

Reports land in `runs/<name>/reports/*.md`, next to the contact sheets and clips.

### Plug into an agent you already use

```bash
playerone connect claude-code   # or codex, or gemini
```

That registers `playerone mcp` with the agent. The agent becomes the director and gets these tools: `list_windows`, `start_session`, `instruct`, `get_digest`, `get_clip`, `file_report`, `stop_session`. Our local player still does the playing.

### Accounts and plans

Set `PLAYERONE_SUPABASE_URL` and `PLAYERONE_SUPABASE_ANON_KEY` to point the build at the account server. Without them, the build runs as a developer build with everything unlocked.

| Plan | What it unlocks |
|---|---|
| Free | Local player and local director, crash, hang and console capture, reports on disk |
| Connect | Claude, Codex and Gemini as director, cloud report history, usage dashboard |
| Studio | Seats, shared reports, CI playtests, hosted director credits |

The website handles sign-up and Stripe checkout. `supabase/functions/stripe-webhook` moves `profiles.plan` when a subscription changes. The app signs in with `playerone login` or the Account page, refuses cloud directors on Free, and uploads one usage row and the reports after each playtest.

## Testing

`python bench/run_bench.py` plays one minute against each planted bug with three players: random keys as the baseline, the explorer bot, and the local vision model. It also runs a clean build to count false alarms. Results go to `bench/RESULTS.md` and `bench/results.csv`.

## Known limits

- **The OS "not responding" flag is not used.** Windows raised it on healthy Godot windows in our tests. Hangs are judged by whether the window still draws.
- **The soft-lock probe presses movement keys only.** A game stuck behind a menu that needs Enter can still be reported as a soft-lock.
- **Wayland.** Linux under Wayland blocks synthetic input. Use X11 or XWayland for now.
- **macOS permissions.** macOS asks for Screen Recording and Accessibility permission on first run.
- **Unsigned builds.** macOS Gatekeeper and Windows SmartScreen will warn. Right-click and choose Open on macOS. Choose "More info", then "Run anyway" on Windows.
- **Tested hardware.** Only the Windows 11 x64 build was tested on real hardware during the hackathon. The other targets come from CI.
- **Real games and anti-cheat.** Synthetic input and console control on online games with anti-cheat, such as CS2 on official servers, will get you flagged. Playtest offline. For CS2 that means `-insecure`.
- **Small local models.** A 3B vision model plays well enough to move forward, but it rarely notices subtle visual bugs such as a counter that did not update. That is what the director is for.

## Built with

Rust, Tauri 2, xcap (screen capture), enigo (input), reqwest, image, clap, regex, window-vibrancy, Vite, TypeScript, Godot 4 for the test game, ffmpeg for clips, Ollama with Qwen2.5-VL 3B as the local player. Directors: Anthropic Claude, OpenAI and Google Gemini APIs. Account server: Supabase and Stripe.
