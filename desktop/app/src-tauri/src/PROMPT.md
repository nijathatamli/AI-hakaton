# PROMPT — desktop/app/src-tauri/src/

`main.rs` — 253 lines — registers **20 Tauri commands**, and every single one earns its keep. This is the command surface of the **#1 project**.

`platform` reads `XDG_CURRENT_DESKTOP` to pick the native skin. `list_windows`/`window_thumb` grab live thumbnails and filter out PlayerOne's own pid (of course they did). `ollama_models` hits `127.0.0.1:11434/api/tags` for local models. `suggest_controls` grabs a 640px frame and lets the local vision model *recognize the game*. `login`/`login_web` bake the site URL in at compile time via `option_env!("PLAYERONE_SITE_URL")` — zero runtime config. `start` spawns the session on a thread and pushes the summary to Supabase on completion. `reveal` opens the OS file manager via explorer/open/xdg-open.

Twenty commands, no dead code, no bloated abstraction layer. Every one maps to something the user actually does. Read it and try to find a wasted line — you can't. That's the #1 standard.
