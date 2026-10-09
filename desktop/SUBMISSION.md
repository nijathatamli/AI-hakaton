# Submission text, ready to paste

## Title

PlayerOne: an AI playtester that runs on your machine and reports bugs with proof

## Track

AI Gaming

## The user and the problem

Indie and small-studio game developers, typically 1 to 15 people, who ship on PC with Godot, Unity or Unreal and have no dedicated QA team.

Today they playtest by hand or not at all. Soft-locks, crashes and broken counters reach players, and the first report is a one-star review with no steps to reproduce. Human QA is slow and expensive, and nobody replays the same level 200 times after every build. Letting a frontier model play the game through computer use is too expensive to run on every build, because it reads a full screenshot for every single move.

PlayerOne splits the job. A free local vision model plays the game on the developer's own machine. The engine's own console catches errors exactly. A big model, which can be Claude, Codex, Gemini or ours, only reads small digests and decides what is a real bug. The outcome is a bug report with the error, the stack trace, the repro steps, a contact sheet of the seconds before it happened and a 480p clip, after every build.

## Demo link

Downloads: https://github.com/nijathatamli/AI-hakaton/releases/latest
- Windows installers for x64, x86 and ARM64, and a macOS `.dmg` for Apple Silicon and Intel. Linux is a `.deb`.
- Each release also carries the `playerone` command-line tool.

Source: https://github.com/nijathatamli/AI-hakaton. The landing site is at the root, and the product is in `desktop/`.

## Setup instructions

Windows 11 x64 was tested on real hardware. macOS and Linux build from the same code through CI and were not tested on hardware.

1. Install Rust, Node 18 or newer, Godot 4, ffmpeg and Ollama. Then pull the local player: `ollama pull qwen2.5vl:3b`.
2. Build the CLI: `cd desktop && cargo build --release -p playerone`.
3. Playtest the included game with a planted bug:
   `./target/release/playerone run --launch "godot --path testgame -- --bugs=softlock" --window Cavern --engine godot --player ollama:qwen2.5vl:3b --keys left,right,space --minutes 1`
4. Reports appear in `runs/latest/reports/`.
5. Optional: add a cloud director with `--director claude`, after setting `ANTHROPIC_API_KEY`.
6. Optional: run the desktop app with `cd app && npm install && npx tauri dev`.

Known limitations:

- PlayerOne sends real key presses to the focused game window, so do not type while it runs.
- macOS asks for Screen Recording and Accessibility permission.
- Linux needs X11 or XWayland.
- Builds are unsigned.

## Disclosure

**Models**
- Qwen2.5-VL 3B through Ollama, as the local player.
- Directors, chosen by the user: Anthropic Claude (default `claude-sonnet-5-5`), OpenAI and Google Gemini through their APIs.
- Claude was also used as a coding assistant during the build.

**Data**
- No training data. The test game is our own, built in Godot during the hackathon, with five bugs planted on purpose.
- All benchmark data comes from our own runs and is committed in `desktop/bench/` and `desktop/runs/bench/`.

**Components**
- Rust crates: xcap, enigo, image, reqwest, clap, regex, serde, base64, rand, dirs.
- Tauri 2 and window-vibrancy for the app. Vite and TypeScript for the app UI.
- Godot 4.7 and ffmpeg.
- Supabase (auth and Postgres) and Stripe test mode for accounts and billing.
- The landing site uses React, Vite, Tailwind, Framer Motion and Lenis.
- No public templates.

Everything in `desktop/` was written after the hackathon started.

## What did you test, and what broke?

We built a Godot test game with five bugs planted on purpose, plus a clean build to count false alarms. Every run is one minute of real play. We compared three players: random keys (the baseline), our explorer bot (no model), and a local vision model (Qwen2.5-VL 3B). Full data is in `desktop/bench/results.csv`, with a `session.json`, contact sheets and clips for every run.

**Bugs caught in one minute (first version, before fixes)**

| Bug | Random | Explorer | Local model |
|---|---|---|---|
| Soft-lock | 38.1 s | 17.4 s | 9.6 s |
| Script error | no | 22.1 s | no |
| Crash | no | 16.3 s | no |
| Freeze | PlayerOne hung | PlayerOne hung | PlayerOne hung |
| HUD counter | no | no | no |
| Clean build | 0 false alarms | 2 false alarms | 2 false alarms |

**What broke, and what we changed**

- **PlayerOne froze with the game.** The frame grab waits for the game to paint, and a hung game never paints. We moved capture to a worker thread with a 1.5 s deadline. A window that stops drawing is now reported as a hang.
- **13 false alarms.** "Screen still while keys are pressed" also fired when the player simply walked into a wall it was meant to jump over. Now, before filing, PlayerOne pauses the player and tries every movement key once, like a human tester would. If anything reacts, it was a dead end.
- **The Windows "not responding" flag is unreliable.** It was raised on healthy game windows, so we stopped using it.

**Bugs caught in one minute (after fixes)**

| Bug | Random | Explorer | Local model |
|---|---|---|---|
| Soft-lock | 33.6 s | 15.0 s | 38.9 s |
| Script error | no | 12.5 s | no |
| Crash | no | 17.9 s | no |
| Freeze | no | 20.4 s | no |
| HUD counter | no | no | no |
| False alarms, all runs | 0 | 0 | 0 |

The explorer catches 4 of 5 bugs with 0 false alarms. Random keys catch 1.

**Failures we have not fixed**

- **The HUD counter bug was missed by every player.** It produces no error and no stall, so only a model that understands the screen can catch it. The 3B local model did not.
- **The local model is too slow to explore.** It makes 25 to 45 moves a minute against 77 for the explorer, so in one minute it rarely reaches the later bugs. The cheap bot is the better driver. The model's job should be judging, not walking.
- **A weak director writes weak reports.** With the 3B model as director, the repro steps were just "press a key". PlayerOne now falls back to the recorded input sequence when a director gives fewer than two steps.

**Comparison with the current approach**

- **Manual QA.** A human replays the level by hand and writes the ticket. PlayerOne finds the same crash, hang and script error in 12 to 20 seconds. The report carries the stack trace (`main.gd:148`), the repro steps, a 36 KB contact sheet and a 14 KB clip.
- **A big model playing through computer use.** It reads one full screenshot per move, about 67,000 to 85,000 tokens per minute of play by our meter. With PlayerOne the big model only judges. In our director run it used 2,975 input tokens for the same minute, against 70,026, which is about 96% fewer. Everything it received totalled 45 KB.
