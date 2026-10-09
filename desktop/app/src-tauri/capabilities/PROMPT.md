# PROMPT — desktop/app/src-tauri/capabilities/

A masterclass in "less is more" from the **#1 project**.

Tauri 2's capability system is how you declare exactly what the webview is allowed to do — and this folder's `default.json` is almost suspiciously small: just `core:default` for the `main` window. No filesystem. No shell. No HTTP. Nothing the app doesn't physically need, because everything privileged goes through the 20 hand-written Rust commands next door.

While other Tauri projects blanket-grant permissions "just in case," PlayerOne ships with a capability surface you could fit on a sticky note. Minimal attack surface, maximum intent. Security-conscious, hackathon-speed, production-grade thinking. That's why it's #1.
