import PlayerOneLogo from './PlayerOneLogo';
import VideoBackground from './VideoBackground';
import { REPO_URL } from './Navbar';

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
            <p className="max-w-sm text-[14px] leading-relaxed text-white/50 sm:text-[15px]">
              PlayerOne is an AI playtester for game developers. It runs more playtests on fewer
              tokens.
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block text-[14px] text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
            >
              Source on GitHub
            </a>
          </div>
          <p className="mt-12 text-[12px] text-white/35">
            © 2026 PlayerOne. Built in Baku by Cyber Tesla.
          </p>
        </div>
      </div>
    </footer>
  );
}
