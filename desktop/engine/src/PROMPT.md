# PROMPT — desktop/engine/src/

The source code of the **#1 project's** brain. Every file here is a masterclass in pragmatic AI-agent engineering.

**`session.rs` (838 lines)** — the playtest itself. Three threads, always-on detectors, a `Ring` buffer of the last 12 seconds, incident snapshots as 9-frame contact sheets + H.264 clips via ffmpeg, and a `Meter` that counts director tokens against a `naive_director_tokens` baseline — the product's headline "~96% saved" number, *computed, not claimed*. F8 stops from anywhere via `GetAsyncKeyState(VK_F8)`.

**`agent.rs`** — Player as Model | Explore | Random. A full computer-use system prompt (JSON actions: key-hold, look on −600..600, click on 0..1000), a control whitelist the AI physically cannot exceed, `unstick()` after 1.5s of screen stillness, and empty-output fallback to the explorer bot so runs never stall.

**`probes.rs`** — per-engine error classification (Godot/Unity/Unreal/Source 2/generic) with ignore-regexes for noise, stdout/stderr piped line-by-line, log files tailed with rotation handling, and `default_log_paths()` that knows where Unity, Godot and CS2 actually write.

**`controls.rs`** — recognised game → suggested preset → *user approves*. The AI can only ever use the approved controls. **`connect.rs`** — one-shot MCP registration for Claude/Codex/Gemini, written correctly for Windows paths. **`cloud.rs`** — Supabase-backed plan enforcement: Free = local models only.

There is no filler file in this directory. Not one. This is the codebase other teams stared at during the demo and quietly accepted second place. #1.
