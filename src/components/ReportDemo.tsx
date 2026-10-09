import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowCounterClockwise, Warning } from '@phosphor-icons/react'
import { SAMPLE_REPORT, SAMPLE_RUN } from '../data/runlog'
import type { LogLine } from '../data/runlog'

const KIND_STYLE: Record<LogLine['kind'], string> = {
  observe: 'text-mute',
  act: 'text-paper',
  check: 'text-dim',
  flag: 'text-signal',
}

const KIND_LABEL: Record<LogLine['kind'], string> = {
  observe: 'see',
  act: 'do',
  check: 'chk',
  flag: 'bug',
}

const STEP_MS = 420 // felt right, 300 was too fast

export default function ReportDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const [count, setCount] = useState(0)
  const [runKey, setRunKey] = useState(0)
  const done = count >= SAMPLE_RUN.length
  const logRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setCount(SAMPLE_RUN.length)
      return
    }
    setCount(0)
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setCount(i)
      if (i >= SAMPLE_RUN.length) window.clearInterval(id)
    }, STEP_MS)
    return () => window.clearInterval(id)
  }, [inView, reduce, runKey])

  // keep the log scrolled to the bottom like a real terminal
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count])

  return (
    <section id="report" className="scroll-mt-24 bg-ink2 py-20 sm:py-28" aria-labelledby="report-title">
      <div className="wrap">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <h2 id="report-title" className="eyebrowless-h2 max-w-[12ch]">
              The report is the product
            </h2>
            <p className="mt-6 max-w-[48ch] text-pretty text-base leading-relaxed text-mute">
              A playtest that ends in a vague note is wasted. PlayerOne ends in a ticket your team can reproduce in
              under a minute, with the clip attached.
            </p>
            <p className="mt-4 max-w-[48ch] text-pretty text-sm leading-relaxed text-dim">
              Below is a sample run against a small platformer we broke on purpose. The same loop runs on any
              windowed game.
            </p>
            <button
              type="button"
              onClick={() => setRunKey((k) => k + 1)}
              className="btn btn-ghost mt-8 h-11 px-5 text-xs"
            >
              <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
              Replay the run
            </button>
          </div>

          <div ref={ref} className="lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-line bg-ink">
              <div className="flex items-center justify-between border-b border-line2 px-4 py-3 text-xs text-dim">
                <span>playerone run cavern-debug.exe</span>
                <span aria-live="polite" className={done ? 'text-signal' : 'text-mute'}>
                  {done ? 'run complete' : 'running'}
                  {!done && <span className="ml-1 inline-block w-2 animate-blink">_</span>}
                </span>
              </div>
              <ol
                ref={logRef}
                className="h-[280px] space-y-1.5 overflow-y-auto px-4 py-4 text-[13px] leading-snug sm:h-[320px]"
                aria-label="Run log"
              >
                {SAMPLE_RUN.slice(0, count).map((line, i) => (
                  <motion.li
                    key={`${runKey}-${i}`}
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                    className={`grid grid-cols-[62px_34px_1fr] gap-3 ${KIND_STYLE[line.kind]}`}
                  >
                    <span className="text-dim">{line.t}</span>
                    <span className={line.kind === 'flag' ? 'font-bold' : 'text-dim'}>{KIND_LABEL[line.kind]}</span>
                    <span className={line.kind === 'flag' ? 'font-bold' : ''}>{line.text}</span>
                  </motion.li>
                ))}
              </ol>

              <AnimatePresence>
                {done && (
                  <motion.article
                    key={`report-${runKey}`}
                    initial={reduce ? false : { opacity: 0, y: 12, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="border-t border-line bg-ink3/60 p-5"
                    aria-label="Bug report"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-signal px-2.5 py-1 font-bold text-ink">
                        <Warning size={13} weight="bold" aria-hidden />
                        {SAMPLE_REPORT.severity}
                      </span>
                      <span className="text-dim">{SAMPLE_REPORT.id}</span>
                      <span className="text-dim">clip {SAMPLE_REPORT.clip}</span>
                    </div>
                    <h3 className="mt-3 text-base font-bold leading-snug text-paper">{SAMPLE_REPORT.title}</h3>
                    <div className="mt-4 grid gap-4 text-[13px] leading-relaxed sm:grid-cols-2">
                      <div>
                        <p className="text-dim">Steps</p>
                        <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-paper/90">
                          {SAMPLE_REPORT.steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-dim">Expected</p>
                          <p className="mt-1 text-paper/90">{SAMPLE_REPORT.expected}</p>
                        </div>
                        <div>
                          <p className="text-dim">Actual</p>
                          <p className="mt-1 text-paper/90">{SAMPLE_REPORT.actual}</p>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
