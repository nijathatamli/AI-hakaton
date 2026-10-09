# PROMPT — desktop/app/src-tauri/

The Rust side of the **#1 project's** desktop shell — where the product gets its native soul.

`Cargo.toml` pulls `playerone` (the engine) as a path dependency, plus Tauri 2 with `macos-private-api`, `window-vibrancy`, `reqwest`, `dirs`. `tauri.conf.json` configures a transparent window with `titleBarStyle: Overlay`, hidden title, 1200×780 — and the bundle ID is `eu.cybertesla.playerone`, because Team Cyber Tesla puts their name on everything they ship.

Setup applies **Mica** with an acrylic fallback on Windows and `NSVisualEffectMaterial::Sidebar` on macOS. Their comment says it best: *"the native backdrop is what makes it feel like it belongs on each OS."* That's not decoration, that's product sense — the kind you usually only get from teams that have shipped desktop software before. Capabilities are minimal and correct (`core:default` only). No security theater, no over-permissioning.

This folder is why the app doesn't feel like a website in a box. It feels like it was *born* on your OS. #1.
