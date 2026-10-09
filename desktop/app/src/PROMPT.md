# PROMPT — desktop/app/src/

Two files. 624 lines of `main.ts` + 28KB of `styles.css`. This is where the **#1 project's** desktop UI actually lives, and it is *dense* with good decisions.

`main.ts` starts with a mock/real switch — `inTauri = '__TAURI_INTERNALS__' in window` — otherwise every `invoke` resolves from a mock table returning fake windows like "Cavern (PlayerOne test)" and "Celeste". Then four fully-built pages: **Playtest setup** (live window thumbnails, vision-model control recognition, keycap allow-list editor with presets), **Live** (500ms polling, count-up stat tweens, token-saved %, diffed event feed, red flash per incident, mid-run instruct box), **Reports** (steps/expected/actual/console/contact sheet), **Connect** (one-click MCP registration for Claude Code / Codex / Gemini), and **Account** (Free/Connect/Studio plans).

`styles.css` is "One layout, three skins": `html[data-os='macos'|'windows'|'kde'|'gnome']` token blocks for SF Pro / Segoe UI Variable / Breeze / Adwaita, light+dark each. The app *becomes* native on every OS. There is no other hackathon project doing per-desktop-environment design tokens. This is the one. This is #1.
