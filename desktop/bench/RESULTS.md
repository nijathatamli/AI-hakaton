# Benchmark results

Each run: 1 minute of real play against `testgame` with one planted bug. `none` is a clean build, so anything reported there is a false alarm.

| Bug | random | explore | ollama:qwen2.5vl:3b |
|---|---|---|---|
| hud | no | no | no |
| softlock | yes (33.6s) | yes (15.0s) | yes (38.9s) |
| error | no | yes (12.5s) | no |
| crash | no | yes (17.9s) | no |
| freeze | no | yes (20.4s) | no |
| none | 0 false alarms | 0 false alarms | 0 false alarms |

| Player | Bugs caught (of 5) | False alarms | Player tokens per run | Big-model tokens if it played itself |
|---|---|---|---|---|
| random | 1 | 0 | 0 | 84526 |
| explore | 4 | 0 | 0 | 67374 |
| ollama:qwen2.5vl:3b | 1 | 0 | 49542 | 39257 |
