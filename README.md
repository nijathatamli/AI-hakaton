# PlayerOne

An AI playtester for small game studios. A free local model or bot plays your game with real keys and mouse, the engine's own console catches errors exactly, and a big model (Claude, Codex, Gemini) only reads small digests to decide what is a real bug. Every bug comes with the error, the stack trace, repro steps, a contact sheet of the seconds before it and a short clip.

Built by team Cyber Tesla at NeuroBridge.SI Baku, 9 to 10 October 2026.

- **The product:** [`desktop/`](desktop/) (Rust engine and CLI, MCP server, Tauri desktop app, Godot test game, benchmark)
- **Downloads:** [latest release](https://github.com/nijathatamli/AI-hakaton/releases/latest) (Windows, macOS, Linux)
- **Website:** [roaring-alfajores-8a941a.netlify.app](https://roaring-alfajores-8a941a.netlify.app) (this repo's root is the site's source)
- **Pitch deck:** [`deck/PlayerOne-pitch.pdf`](deck/PlayerOne-pitch.pdf)

## Results

Five bugs planted on purpose in our own Godot game, plus a clean build to count false alarms. One minute of real play per run, three players. Full data in [`desktop/bench/RESULTS.md`](desktop/bench/RESULTS.md) and [`results.csv`](desktop/bench/results.csv), with logs, frames and clips for every run under [`desktop/runs/bench/`](desktop/runs/bench/).

| Bug | Random keys (baseline) | Explorer bot | Local AI (Qwen2.5-VL 3B) |
|---|---|---|---|
| Soft-lock | 33.6 s | 15.0 s | 38.9 s |
| Script error | missed | 12.5 s | missed |
| Crash | missed | 17.9 s | missed |
| Freeze | missed | 20.4 s | missed |
| HUD counter | missed | missed | missed |
| False alarms (clean build) | 0 | 0 | 0 |

A sample report: [`crash-explore/reports/001.md`](desktop/runs/bench/crash-explore/reports/001.md).

What these numbers do and do not show:

- Detection is rule-based on purpose (console patterns, crash, hang, soft-lock with a retry check). That is why there are no false alarms. AI picks the controls, plays from pixels, judges incidents and writes the reports.
- The HUD counter bug needs a model that understands the screen. The 3B model missed it. That is the director's job, and it is the main open problem.
- One run per cell, bugs we planted ourselves. Not yet tested on third-party games.

## Running cost

Measured by the meter in every `session.json`, priced at Claude Sonnet 5.5 input rates ($2 per 1M tokens). Output tokens are extra and small.

| | Tokens per minute of play | Cost per minute | Cost per hour |
|---|---|---|---|
| Big model plays the game itself (one screenshot per move) | 70,026 | ≈ $0.14 | ≈ $8.40 |
| PlayerOne (local player, big model judges digests) | 2,975 | ≈ $0.006 | ≈ $0.36 |
| PlayerOne Free (local player, no cloud director) | 0 | $0 | $0 |

No training data is needed. PlayerOne works from the screen and the engine console, with no SDK and no game source code.

## Next step

A 30-day pilot with three Baku indie studios on their real games, measuring bugs found per build. On the product side: Unity and Unreal log probes on real projects, and signed builds.

## Run it

```bash
cd desktop
cargo build --release -p playerone
cargo test -p playerone --lib          # unit tests: console classifier, token meter, command parsing
./target/release/playerone run --launch "godot --path testgame -- --bugs=crash" \
  --window Cavern --engine godot --player explore --minutes 1
```

More in [`desktop/README.md`](desktop/README.md).

## Website

```bash
npm install
npm run dev      # localhost:5173
```

React 18, Vite, Tailwind 3, Framer Motion.
