# PlayerOne

<<<<<<< HEAD
An AI playtester. It watches a game window, plays it with computer use, and files the bug report. Built by team Cyber Tesla at NeuroBridge.SI Baku, 9 to 10 October 2026.

This repo is the landing site for now. The tester code comes in its own folder when it's ready.

## Run the site

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # output in dist/
npm run preview    # serve the build
```

## Hero assets

The hero plays a full-viewport video and scrubs it with the pointer. Drop these two files into `public/`:

- `hero-llama.mp4`, the llama mascot clip, muted, 1920x1080 or larger
- `hero-llama.jpg`, a poster frame shown before the video loads

If the files are missing the hero falls back to a dark gradient, so the site still builds and deploys.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 3, Framer Motion, Phosphor icons. Fonts are Space Mono and Anton SC from Google Fonts.

## Where things are

- `src/App.tsx` orders the sections.
- `src/components/` holds one file per section plus the navbar, logo and footer.
- `src/data/runlog.ts` is the sample run and report shown in "The report is the product". It is illustrative. Replace it with a real recorded run when one exists.
- `src/index.css` holds the theme tokens, button styles and browser surface styling.
=======
An AI playtester. Computer-use agents, running on large cloud models or local Llama models, play your game, find bugs, and write reports. Playtests start automatically through your agent harness.
>>>>>>> febadb6 (landing page)
