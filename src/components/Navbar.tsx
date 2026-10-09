import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Github } from 'lucide-react';
import ScrambleText from './ScrambleText';
import PlayerOneLogo from './PlayerOneLogo';
import SquashHamburger from './SquashHamburger';
import { scrollToTarget } from '../lib/smoothScroll';

export const REPO_URL = 'https://github.com/nijathatamli/AI-hakaton';

const PILL_SPRING = { type: 'spring' as const, stiffness: 350, damping: 28 };

interface NavbarProps {
  entranceComplete: boolean;
}

function NavLink({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={`whitespace-nowrap rounded-md transition-colors ${className}`}
    >
      <ScrambleText text={label} isHovered={hovered} />
    </button>
  );
}

function SourceButton({ mobile = false }: { mobile?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.03, backgroundColor: '#e2e2e6' }}
      whileTap={{ scale: 0.97 }}
      className={`flex shrink-0 items-center gap-2 rounded-full bg-white text-black ${
        mobile ? 'h-9 px-3.5 text-[13px]' : 'h-12 px-6 text-[15px]'
      }`}
    >
      <Github size={mobile ? 14 : 16} strokeWidth={2} aria-hidden="true" />
      <ScrambleText text="Source" isHovered={hovered} />
    </motion.a>
  );
}

const LINKS = [
  { label: 'About', id: 'about' },
  { label: 'Why', id: 'why' },
  { label: 'How it works', id: 'how' },
];

export default function Navbar({ entranceComplete }: NavbarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const goTo = (id: string) => {
    scrollToTarget(`#${id}`);
    setOpen(false);
  };

  const goTop = () => scrollToTarget(0);

  return (
    <motion.nav
      aria-label="Primary"
      initial={{ opacity: 0 }}
      animate={{ opacity: entranceComplete ? 1 : 0 }}
      transition={{ duration: 0.8 }}
      className="fixed top-0 left-0 right-0 z-50 h-20 bg-transparent"
      style={{ pointerEvents: entranceComplete ? 'auto' : 'none' }}
    >
      {/* Desktop */}
      <div className="hidden sm:flex h-full items-center justify-between px-6 md:px-8">
        <div className="flex gap-2">
          <motion.button
            type="button"
            onClick={goTop}
            aria-label="PlayerOne, back to top"
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.22)' }}
            whileTap={{ scale: 0.98 }}
            className={`${
              open ? 'hidden md:flex' : 'flex'
            } h-12 items-center gap-2.5 rounded-[14px] bg-white/15 px-5 backdrop-blur-md`}
          >
            <PlayerOneLogo size={18} className="text-white" />
            <span className="text-[16px] font-medium tracking-tight text-white">PlayerOne</span>
          </motion.button>

          <motion.div
            initial={false}
            animate={{ width: open ? 360 : 48 }}
            transition={PILL_SPRING}
            className="flex h-12 items-center overflow-hidden rounded-[14px] bg-white/15 backdrop-blur-md"
          >
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`flex shrink-0 items-center justify-center transition-colors ${
                open
                  ? 'ml-1.5 h-9 w-9 rounded-[11px] bg-white/10 hover:bg-white/20'
                  : 'h-12 w-12 rounded-[14px]'
              }`}
            >
              <SquashHamburger open={open} size="md" />
            </button>
            <motion.div
              initial={false}
              animate={{ opacity: open ? 1 : 0, x: open ? 0 : 15 }}
              transition={{ duration: 0.3, delay: open ? 0.1 : 0 }}
              className="flex items-center gap-6 pl-5"
              style={{ pointerEvents: open ? 'auto' : 'none' }}
              aria-hidden={!open}
            >
              {LINKS.map((l) => (
                <NavLink
                  key={l.id}
                  label={l.label}
                  onClick={() => goTo(l.id)}
                  className="text-[15px] font-normal text-white/85 hover:text-white"
                />
              ))}
            </motion.div>
          </motion.div>
        </div>

        <SourceButton />
      </div>

      {/* Mobile */}
      <div className="flex sm:hidden h-full items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 flex-1 items-center">
          <motion.button
            type="button"
            onClick={goTop}
            aria-label="PlayerOne, back to top"
            initial={false}
            animate={{ width: open ? 0 : 'auto', marginRight: open ? 0 : 6 }}
            transition={PILL_SPRING}
            className="flex h-9 shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-[10px] bg-white/15 backdrop-blur-md"
            style={{ paddingLeft: open ? 0 : 12, paddingRight: open ? 0 : 12 }}
          >
            <PlayerOneLogo size={15} className="shrink-0 text-white" />
            <span className="text-[13px] font-medium tracking-tight text-white">PlayerOne</span>
          </motion.button>

          <motion.div
            initial={false}
            animate={{ width: open ? '100%' : 36 }}
            transition={PILL_SPRING}
            className="flex h-9 items-center overflow-hidden rounded-[10px] bg-white/15 backdrop-blur-md"
          >
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center"
            >
              <SquashHamburger open={open} size="sm" />
            </button>
            <motion.div
              initial={false}
              animate={{ opacity: open ? 1 : 0, x: open ? 0 : 15 }}
              transition={{ duration: 0.3, delay: open ? 0.1 : 0 }}
              className="flex items-center gap-4 pl-2"
              style={{ pointerEvents: open ? 'auto' : 'none' }}
              aria-hidden={!open}
            >
              {LINKS.map((l) => (
                <NavLink
                  key={l.id}
                  label={l.label}
                  onClick={() => goTo(l.id)}
                  className="text-[12px] font-normal text-white/85 hover:text-white"
                />
              ))}
            </motion.div>
          </motion.div>
        </div>

        <SourceButton mobile />
      </div>
    </motion.nav>
  );
}
