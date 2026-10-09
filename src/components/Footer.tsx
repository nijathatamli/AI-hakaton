<<<<<<< HEAD
import Logo from './Logo'
import { REPO_URL } from './Navbar'

export default function Footer() {
  return (
    <footer className="hairline py-10">
      <div className="wrap flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-[40ch] text-sm text-mute">An AI playtester that watches, plays and files the bug.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-mute sm:items-end">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-paper hover:underline">
            Source
          </a>
          <span>Team Cyber Tesla. 2026.</span>
        </div>
      </div>
    </footer>
  )
=======
import PlayerOneLogo from './PlayerOneLogo';
import VideoBackground from './VideoBackground';

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_080203_fd7f4f85-3a86-4837-8192-85e7bfe68e75.mp4';

export default function Footer() {
  return (
    <footer className="overflow-hidden bg-black">
      <div className="flex min-h-[400px] flex-col md:flex-row">
        <div className="relative h-[300px] w-full md:h-auto md:w-1/2">
          <VideoBackground src={VIDEO} />
        </div>
        <div className="flex w-full flex-col justify-between p-10 sm:p-16 md:w-1/2">
          <div>
            <div className="mb-8 flex items-center gap-2.5">
              <PlayerOneLogo size={18} className="text-white/70" />
              <span className="text-[15px] font-medium tracking-tight text-white/70">PlayerOne</span>
            </div>
            <p className="max-w-sm text-[14px] leading-relaxed text-white/40 sm:text-[15px]">
              PlayerOne is an AI playtester for game developers. It runs more playtests on fewer
              tokens.
            </p>
          </div>
          <p className="mt-12 text-[12px] text-white/25">
            © 2026 PlayerOne. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
>>>>>>> febadb6 (landing page)
}
