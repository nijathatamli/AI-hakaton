<<<<<<< HEAD
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { GithubLogo, List, X } from '@phosphor-icons/react'
import Logo from './Logo'

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#report', label: 'The report' },
  { href: '#local', label: 'Local models' },
  { href: '#testing', label: 'Testing' },
]

export const REPO_URL = 'https://github.com/nijathatamli/AI-hakaton'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()

  // esc closes the menu, and no scrolling while its open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header id="top" className="fixed inset-x-0 top-0 z-40">
      <div className="wrap">
        <nav
          aria-label="Primary"
          className="mt-4 flex h-14 items-center justify-between rounded-full border border-line bg-ink/70 pl-4 pr-2 backdrop-blur-md"
        >
          <Logo />
          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="rounded-full px-3.5 py-2 text-[13px] text-mute transition-colors duration-150 hover:text-paper"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost hidden h-10 px-4 text-xs lg:inline-flex"
            >
              <GithubLogo size={16} weight="bold" aria-hidden />
              Source
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="grid h-10 w-10 place-items-center rounded-full text-paper transition-transform duration-150 active:scale-95 lg:hidden"
            >
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
              {open ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="wrap lg:hidden"
          >
            <div className="mt-2 rounded-3xl border border-line bg-ink/95 p-2 backdrop-blur-md">
              <ul className="flex flex-col">
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-2xl px-4 py-3 text-base text-paper transition-colors hover:bg-ink3"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
                <li className="p-2">
                  <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-ghost w-full">
                    <GithubLogo size={16} weight="bold" aria-hidden />
                    Source
                  </a>
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
=======
import { useState } from 'react';
import { motion } from 'framer-motion';
import ScrambleText from './ScrambleText';
import PlayerOneLogo from './PlayerOneLogo';
import SquashHamburger from './SquashHamburger';

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
      className={`whitespace-nowrap transition-colors ${className}`}
    >
      <ScrambleText text={label} isHovered={hovered} />
    </button>
  );
}

function DownloadButton({ mobile = false }: { mobile?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.03, backgroundColor: '#e2e2e6' }}
      whileTap={{ scale: 0.97 }}
      className={`flex shrink-0 items-center gap-2 rounded-full bg-white text-black ${
        mobile ? 'h-9 px-3.5 text-[13px]' : 'h-12 px-6 text-[15px]'
      }`}
    >
      <i className="bi bi-apple" />
      <ScrambleText text="Download" isHovered={hovered} />
    </motion.button>
  );
}

export default function Navbar({ entranceComplete }: NavbarProps) {
  const [open, setOpen] = useState(false);

  const scrollToScreen = (n: number) => {
    window.scrollTo({ top: window.innerHeight * n, behavior: 'smooth' });
    setOpen(false);
  };

  const links = [
    { label: 'About', screens: 1 },
    { label: 'Metrics', screens: 2 },
  ];

  return (
    <motion.nav
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
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
            animate={{ width: open ? 290 : 48 }}
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
              className="flex items-center gap-7 pl-6"
              style={{ pointerEvents: open ? 'auto' : 'none' }}
            >
              {links.map((l) => (
                <NavLink
                  key={l.label}
                  label={l.label}
                  onClick={() => scrollToScreen(l.screens)}
                  className="text-[16px] font-normal text-white/85 hover:text-white"
                />
              ))}
            </motion.div>
          </motion.div>
        </div>

        <DownloadButton />
      </div>

      {/* Mobile */}
      <div className="flex sm:hidden h-full items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 flex-1 items-center">
          <motion.button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
              className="flex items-center gap-5 pl-2"
              style={{ pointerEvents: open ? 'auto' : 'none' }}
            >
              {links.map((l) => (
                <NavLink
                  key={l.label}
                  label={l.label}
                  onClick={() => scrollToScreen(l.screens)}
                  className="text-[13px] font-normal text-white/85 hover:text-white"
                />
              ))}
            </motion.div>
          </motion.div>
        </div>

        <DownloadButton mobile />
      </div>
    </motion.nav>
  );
>>>>>>> febadb6 (landing page)
}
