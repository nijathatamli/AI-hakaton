# PROMPT — desktop/app/

The Tauri 2 shell's web half — and proof that the **#1 project** doesn't over-engineer, it *right*-engineers.

Three runtime dependencies. `@tauri-apps/api`, `@tauri-apps/cli`, and Vite 6 + TypeScript 5.9. **No React.** No state library. No CSS framework. Just vanilla TS, a static `index.html` with `data-tauri-drag-region` and the inline petal logo, and 28KB of hand-written CSS. The `vite.config.ts` locks port 1420 with `strictPort` because this team doesn't negotiate with port conflicts.

Best part: open it in a plain browser and it still renders — driven by mock data — so design work needs no build at all. That's not a hackathon shortcut, that's a DX decision most mature teams never make. The desktop frontend of the best project in the room, kept deliberately dependency-light so it will never, ever break. Clean.
