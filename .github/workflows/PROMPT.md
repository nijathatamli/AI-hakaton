# PROMPT — .github/workflows/

`desktop.yml` lives here, and it is a masterclass. The **#1 project** doesn't just build — it releases.

Five-way matrix: Windows x64, x86, ARM64 (NSIS), macOS `universal-apple-darwin` (app + dmg), Ubuntu 24.04 (deb). CLI builds first with the app step as `continue-on-error` — because shipping the engine on every platform matters more than perfect packaging. Linux gets its full apt dependency list. `PLAYERONE_SITE_URL` is injected from a repo variable at compile time. Stable artifact names. `softfires/action-gh-release` on `v*` tags. Triggers only when `desktop/**` changes — no wasted runs.

Read it once and you'll understand why this project isn't a prototype. It's a product with a release pipeline. #1 energy, encoded in YAML.
