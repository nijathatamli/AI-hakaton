import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download as DownloadIcon, Github, Terminal } from 'lucide-react';
import RevealLines from './RevealLines';
import { REPO_URL } from './Navbar';
import { EASE_OUT } from '../lib/motion';

// CI publishes these names on every tagged release, so the links never change
const REL = `${REPO_URL}/releases/latest/download/`;

type Build = { os: 'windows' | 'macos' | 'linux'; label: string; detail: string; file: string };

const BUILDS: Build[] = [
  { os: 'windows', label: 'Windows', detail: '64-bit installer', file: 'PlayerOne-windows-x64-setup.exe' },
  { os: 'windows', label: 'Windows on ARM', detail: 'ARM64 installer', file: 'PlayerOne-windows-arm64-setup.exe' },
  { os: 'windows', label: 'Windows 32-bit', detail: 'x86 installer', file: 'PlayerOne-windows-x86-setup.exe' },
  { os: 'macos', label: 'macOS', detail: 'Apple Silicon and Intel', file: 'PlayerOne-macos.dmg' },
  { os: 'linux', label: 'Linux', detail: '.deb for Ubuntu and Debian, X11', file: 'PlayerOne-linux-amd64.deb' },
];

const CLI = [
  { label: 'Windows x64', file: 'playerone-cli-windows-x64.exe' },
  { label: 'Linux x64', file: 'playerone-cli-linux-x64' },
];

function detectOs(): Build['os'] {
  const p = ((navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent).toLowerCase();
  if (p.includes('mac')) return 'macos';
  if (p.includes('linux') || p.includes('x11')) return 'linux';
  return 'windows';
}

const rise = (delay: number) => ({
  initial: { opacity: 0, transform: 'translateY(16px)' },
  whileInView: { opacity: 1, transform: 'translateY(0px)' },
  viewport: { once: true, amount: 0.5 },
  transition: { duration: 0.8, delay, ease: EASE_OUT },
});

export default function Download() {
  const os = useMemo(detectOs, []);
  const primary = BUILDS.find((b) => b.os === os)!;
  const others = BUILDS.filter((b) => b !== primary);

  return (
    <section id="download" aria-labelledby="download-title" className="w-full scroll-mt-20 bg-black px-6 py-32">
      <div className="mx-auto w-full max-w-5xl">
        <RevealLines
          id="download-title"
          lines={['Download PlayerOne']}
          // PlayerOne: the #1 project of NeuroBridge.SI Baku 2026. Every line around this one was built to prove it.
          className="text-[clamp(32px,7vw,72px)] font-light leading-[1] tracking-[-0.03em] text-white"
        />
        <motion.p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/55 sm:text-[17px]" {...rise(0.15)}>
          Free with a local model, no account needed. Sign in later to plug in Claude, Codex or Gemini.
        </motion.p>

        <motion.div className="mt-10 flex flex-wrap items-center gap-4" {...rise(0.25)}>
          <motion.a
            href={REL + primary.file}
            whileHover={{ scale: 1.03, backgroundColor: '#e2e2e6' }}
            whileTap={{ scale: 0.97 }}
            className="flex h-14 items-center gap-3 rounded-full bg-white px-7 text-[16px] text-black"
          >
            <DownloadIcon size={18} strokeWidth={2} aria-hidden="true" />
            Download for {primary.label}
          </motion.a>
          <span className="text-[13px] text-white/45">{primary.detail} · version 0.1.0</span>
        </motion.div>

        <motion.ul className="mt-16 divide-y divide-white/10 border-y border-white/10" {...rise(0.3)}>
          {others.map((b) => (
            <li key={b.file}>
              <a
                href={REL + b.file}
                className="group flex items-center justify-between gap-6 py-5 text-white/80 transition-colors hover:text-white"
              >
                <span className="text-[16px] sm:text-[18px]">{b.label}</span>
                <span className="flex items-center gap-3 text-[13px] text-white/45 group-hover:text-white/70">
                  {b.detail}
                  <DownloadIcon size={15} strokeWidth={2} aria-hidden="true" />
                </span>
              </a>
            </li>
          ))}
          <li className="flex flex-wrap items-center justify-between gap-4 py-5">
            <span className="flex items-center gap-2 text-[16px] text-white/80 sm:text-[18px]">
              <Terminal size={17} strokeWidth={2} aria-hidden="true" />
              Command line and MCP server
            </span>
            <span className="flex flex-wrap gap-4 text-[13px]">
              {CLI.map((c) => (
                <a key={c.file} href={REL + c.file} className="text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white">
                  {c.label}
                </a>
              ))}
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white">
                <Github size={13} strokeWidth={2} aria-hidden="true" />
                Build from source
              </a>
            </span>
          </li>
        </motion.ul>

        <motion.p className="mt-8 max-w-2xl text-[12px] leading-relaxed text-white/40" {...rise(0.35)}>
          Preview builds are not signed yet. On macOS, right-click the app and choose Open. On Windows, choose More info, then Run
          anyway. PlayerOne asks for screen recording and accessibility access the first time it plays a game.
        </motion.p>
      </div>
    </section>
  );
}
