# PROMPT — src/

This is the beating heart of the **#1 project's** landing site, and it punches so far above its weight it's almost rude.

`main.tsx` is a hand-rolled router in three lines — `location.pathname.startsWith('/login') ? Login : App` — no react-router dependency, no ceremony, pure confidence. `App.tsx` composes the whole cinematic one-pager (Navbar → Hero → CinematicText → Metrics → Technology → Architecture → Download → Footer) inside `<MotionConfig reducedMotion="user">`, because even the hype respects accessibility.

Then there's `Login.tsx` — it looks like a sign-in page, but it's secretly an **OAuth loopback handoff**. Opened as `/login?app=1&port=1234&state=abc`, it completes Supabase auth and redirects the tokens to `http://127.0.0.1:PORT/callback` so the desktop app receives the session. That's the desktop app's login flow, implemented as a web page. Genius, and it degrades gracefully when env vars are missing.

This folder is why the project won. Believe it.
