import { motion, useReducedMotion } from 'framer-motion'
import { Eye, GameController, FileText } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

type Layer = {
  icon: Icon
  title: string
  body: string
  emits: string[]
}

const LAYERS: Layer[] = [
  {
    icon: Eye,
    title: 'Observe',
    body: 'It captures the window like a player would see it. No engine hook, no debug build, no SDK. If it runs on a screen, PlayerOne can watch it.',
    emits: ['Screenshots every step', 'Frame difference', 'Process health'],
  },
  {
    icon: GameController,
    title: 'Play',
    body: 'A vision model reads the frame and picks the next input. Keys and mouse go through the operating system, so the game cannot tell it apart from a person.',
    emits: ['Keyboard and mouse', 'Goal tracking', 'Stuck detection'],
  },
  {
    icon: FileText,
    title: 'Report',
    body: 'When something breaks, it writes the ticket. Steps to reproduce, expected and actual behaviour, and a clip of the moment it happened.',
    emits: ['Repro steps', 'Severity', 'Video clip'],
  },
]

export default function HowItWorks() {
  const reduce = useReducedMotion()
  return (
    <section id="how" className="scroll-mt-24 py-20 sm:py-28" aria-labelledby="how-title">
      <div className="wrap">
        <h2 id="how-title" className="eyebrowless-h2 max-w-[14ch]">
          Three layers, one playtest
        </h2>

        <ol className="mt-14 sm:mt-20">
          {LAYERS.map((layer, i) => {
            const Ic = layer.icon
            return (
              <motion.li
                key={layer.title}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="hairline grid gap-6 py-9 sm:py-12 lg:grid-cols-12"
                style={{ marginLeft: `calc(${i} * var(--step, 0px))` }}
              >
                <div className="flex items-start gap-4 lg:col-span-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink3 text-signal">
                    <Ic size={22} weight="bold" aria-hidden />
                  </span>
                  <h3 className="display pt-1 text-[clamp(2rem,4.5vw,3.5rem)]">{layer.title}</h3>
                </div>
                <p className="max-w-[52ch] text-pretty text-base leading-relaxed text-mute lg:col-span-5">{layer.body}</p>
                <ul className="flex flex-wrap gap-2 lg:col-span-3 lg:flex-col lg:items-end lg:gap-1.5">
                  {layer.emits.map((e) => (
                    <li key={e} className="rounded-full border border-line px-3 py-1 text-xs text-paper/80">
                      {e}
                    </li>
                  ))}
                </ul>
              </motion.li>
            )
          })}
        </ol>
      </div>
      {/* staircase offset on desktop only, inline because tailwind cant do calc with the index */}
      <style>{`#how ol { --step: 0px } @media (min-width: 1024px) { #how ol { --step: 6% } }`}</style>
    </section>
  )
}
