import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { ArrowDown } from '@phosphor-icons/react'

const VIDEO_SRC = '/hero-llama.mp4'
const POSTER_SRC = '/hero-llama.jpg'

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasVideo, setHasVideo] = useState(true)
  const reduce = useReducedMotion()

  // mouse x -> video time. spring so it doesnt jump around
  const x = useMotionValue(0.5)
  const scrub = useSpring(x, { stiffness: 60, damping: 20, mass: 0.6 })

  useEffect(() => {
    const v = videoRef.current
    if (!v || reduce) return
    const unsub = scrub.on('change', (t) => {
      if (!v.duration || Number.isNaN(v.duration) || !v.paused) return
      v.currentTime = t * v.duration
    })
    return unsub
  }, [scrub, reduce])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (reduce) {
      v.pause()
      return
    }
    // let it autoplay until the user moves the mouse, then we scrub
    const onFirstMove = () => v.pause()
    window.addEventListener('pointermove', onFirstMove, { once: true })
    return () => window.removeEventListener('pointermove', onFirstMove)
  }, [reduce])

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    x.set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)))
  }

  const enter = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.7, delay, ease: [0.23, 1, 0.32, 1] as const },
  })

  return (
    <section
      onPointerMove={onMove}
      className="relative isolate flex min-h-[100dvh] flex-col justify-end overflow-hidden pb-10 pt-28 sm:pb-14"
      aria-labelledby="hero-title"
    >
      {/* TODO nijat: put the llama video in public/ (hero-llama.mp4 + jpg poster) */}
      {hasVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          muted
          playsInline
          autoPlay
          loop
          preload="metadata"
          onError={() => setHasVideo(false)}
          aria-hidden
        />
      ) : (
        <div
          className="absolute inset-0 -z-20 bg-[radial-gradient(80%_60%_at_70%_30%,#1b2110_0%,#0a0a0a_70%)]"
          aria-hidden
        />
      )}
      <div className="scrim absolute inset-0 -z-10" aria-hidden />

      {/* big P1 in the back */}
      <div
        aria-hidden
        className="display pointer-events-none absolute -right-[2vw] top-[10vh] -z-10 select-none text-[30vw] leading-none text-paper/[0.035] lg:top-[2vh]"
      >
        P1
      </div>

      <div className="wrap">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-9">
            <motion.h1
              id="hero-title"
              className="display text-[clamp(2.9rem,7.4vw,6.75rem)]"
              {...enter(0.05)}
            >
              AI plays your game.
              <br />
              <span className="text-signal">Then files the bug.</span>
            </motion.h1>
          </div>
          <div className="lg:col-span-3 lg:pb-3">
            <motion.p className="max-w-[38ch] text-pretty text-base text-mute sm:text-lg" {...enter(0.2)}>
              PlayerOne watches the screen, plays with computer use, and writes the report. Any engine, no SDK.
            </motion.p>
            <motion.div className="mt-7 flex flex-wrap gap-3" {...enter(0.3)}>
              <a href="#report" className="btn btn-solid">
                See it find a bug
                <ArrowDown size={16} weight="bold" aria-hidden />
              </a>
              <a href="#how" className="btn btn-ghost">
                How it works
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
