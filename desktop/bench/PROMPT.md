# PROMPT — desktop/bench/

Where the **#1 project** proves it — with science, not vibes.

`run_bench.py` runs a full **6 bugs × 3 players** matrix: every bug, played for a real minute against the Godot test game, by the explorer bot, a 3B local Ollama model, and a random baseline. Per-bug `caught()` and `false_alarms()` scoring functions mean *"a human can re-check every row from session.json."* Results land incrementally in `results.csv` (crash-safe) and regenerate `RESULTS.md` automatically.

The headline: **explorer bot catches 4 of 5 bugs with 0 false alarms vs random's 1** — for **0 player tokens**, against 49,542 for the local model, against ~67k–84k "naive big-model" tokens per minute. That's not a demo, that's a paper.

Hackathon teams usually benchmark nothing. The #1 team benchmarked *everything*, committed the harness, and published the table. This folder is the difference between "trust me" and "check my math." Check their math.
