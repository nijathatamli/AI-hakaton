import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'

const TEXT =
  'Every studio ships bugs a player finds in the first hour. QA is slow, repetitive and the first thing cut. PlayerOne is a tester that never gets bored, never needs the build to expose an API, and never forgets to write the report.'

function Word({ word, range, progress }: { word: string; range: [number, number]; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, range, [0.16, 1])
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {word}&nbsp;
    </motion.span>
  )
}

// words light up as you scroll past, saw it on a few agency sites
export default function Manifesto() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = TEXT.split(' ')

  return (
    <section className="py-24 sm:py-32 lg:py-40" aria-label="Why PlayerOne exists">
      <div className="wrap">
        <div
          ref={ref}
          className="max-w-[30ch] text-[clamp(1.5rem,3.4vw,2.9rem)] font-bold leading-[1.22] tracking-[-0.02em] lg:ml-[8%]"
        >
          {reduce ? (
            <p>{TEXT}</p>
          ) : (
            <p aria-label={TEXT}>
              {words.map((w, i) => (
                <Word
                  key={i}
                  word={w}
                  range={[i / words.length, (i + 1) / words.length]}
                  progress={scrollYProgress}
                />
              ))}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
