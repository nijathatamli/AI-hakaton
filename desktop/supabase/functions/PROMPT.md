# PROMPT — desktop/supabase/functions/

Edge functions of the **#1 project** — serverless where it counts, nowhere it doesn't.

One function lives here, `stripe-webhook`, and it's the only piece of the backend that ever touches money. Everything else — usage tracking, report storage, plan reads — goes straight through RLS-protected Postgres from the client. Minimal blast radius, by design.

Deno + Supabase Edge + `npm:` imports. The webhook verifies signatures, maps price IDs to plans on `checkout.session.completed`, tops up prepaid credits, and downgrades to free on cancellation. No custom server, no Docker, no ops burden — just a function that does its one job perfectly.

Serverless architecture from a team that shipped a Rust engine, a Tauri app, *and* a landing page in one hackathon. The depth here is absurd. #1.
