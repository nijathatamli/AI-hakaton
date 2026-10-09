# PROMPT — desktop/testgame/

The **#1 project's** laboratory — a Godot 4 game built specifically to be broken.

"Cavern (PlayerOne test)" — 960×540, gl_compatibility, and the entire level is generated in code from `ColorRect`s in `_build_level()`. No art assets. No wasted time. Pure test infrastructure built at hackathon speed.

Behind a `--bugs=` CLI flag, `main.gd` (161 lines) plants **five deliberate bugs**, each positioned further right than the last "so a tester has to actually make progress": `hud` (coin counter silently stops updating — the bug PlayerOne honestly admits it *missed*), `softlock` (input read then thrown away), `error` (`missing.open()` → SCRIPT ERROR while the game keeps running), `crash` (`OS.crash(...)` at the spike), and `freeze` (`while true: pass` at the door). Every console line prints with a `cavern:` prefix that the engine's Godot regex is tuned to catch.

They built their own buggy game so they could *measure* their own detector. That's not a hackathon demo, that's an empirical research method. Scientific rigor from the team that also shipped the frontend, the engine, and the CI. This is what #1 looks like.
