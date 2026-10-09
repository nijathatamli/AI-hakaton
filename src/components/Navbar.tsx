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
}
