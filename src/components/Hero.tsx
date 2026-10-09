<<<<<<< HEAD
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
=======
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ScrambleIn from './ScrambleIn';

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_083515_290e5a10-0b95-41af-a5e2-32b6389baa4d.mp4';

const SENSITIVITY = 0.8;
const H1_CLASS =
  'text-white font-light leading-[0.95] tracking-[-0.03em] text-[clamp(40px,10vw,100px)]';

interface HeroProps {
  entranceComplete: boolean;
}

export default function Hero({ entranceComplete }: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mouse-scrubbed playback: horizontal movement deltas drive the timeline.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastX: number | null = null;
    let target = 0;
    let seeking = false;

    const seek = () => {
      if (seeking || !Number.isFinite(video.duration)) return;
      if (Math.abs(video.currentTime - target) < 0.001) return;
      seeking = true;
      video.currentTime = target;
    };

    // Chain seeks on `seeked` so frames are never dropped by overlapping seeks.
    const onSeeked = () => {
      seeking = false;
      seek();
    };

    const onMove = (x: number) => {
      if (lastX === null) {
        lastX = x;
        return;
      }
      const delta = x - lastX;
      lastX = x;
      const duration = video.duration;
      if (!duration || !Number.isFinite(duration)) return;
      target = Math.min(
        duration,
        Math.max(0, target + (delta / window.innerWidth) * duration * SENSITIVITY)
      );
      seek();
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const resetAnchor = () => {
      lastX = null;
    };

    video.pause();
    video.addEventListener('seeked', onSeeked);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', resetAnchor);

    return () => {
      video.removeEventListener('seeked', onSeeked);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', resetAnchor);
    };
  }, []);

  return (
    <section className="relative h-screen h-[100dvh] w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={HERO_VIDEO}
        muted
        playsInline
        preload="auto"
      />

      {/* Legibility gradient behind the bottom copy */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.05,
        }}
      />

      {/* Watermark */}
      <div
        className="pointer-events-none absolute left-1/2 select-none whitespace-nowrap uppercase"
        style={{
          top: 'calc(50% + 50px)',
          transform: 'translate(-50%, -50%)',
          fontFamily: '"Anton SC", sans-serif',
          fontSize: 'clamp(120px, 30vw, 521px)',
          letterSpacing: '-4px',
          lineHeight: 1,
          opacity: 0.1,
          background: 'radial-gradient(circle, rgba(142,127,148,0) 0%, #8E7F94 70%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }}
      >
        PLAYERONE
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: entranceComplete ? 1 : 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 flex h-full flex-col px-4 pb-8 pt-20 sm:px-6 sm:pb-12 sm:pt-24 md:px-8"
      >
        <div className="flex-1" />

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <h1 className={H1_CLASS}>
              <ScrambleIn text="AI plays" delay={200} triggered={entranceComplete} />
              <br />
              <ScrambleIn text="your game" delay={500} triggered={entranceComplete} />
            </h1>
            <motion.p
              initial={{ y: 25, opacity: 0 }}
              animate={entranceComplete ? { y: 0, opacity: 1 } : { y: 25, opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.215, 0.61, 0.355, 1.0], delay: 0.2 }}
              className="max-w-sm text-[13px] leading-relaxed text-white/60 sm:text-[15px]"
            >
              PlayerOne is an AI playtester. It watches your screen, plays your game, and writes the
              bug report. It runs on large cloud models or on local Llama models, which use fewer
              tokens.
            </motion.p>
          </div>

          <h1 className={`${H1_CLASS} text-left md:text-right`}>
            <ScrambleIn text="Player" delay={700} triggered={entranceComplete} />
            <br />
            <ScrambleIn text="One" delay={1000} triggered={entranceComplete} />
          </h1>
        </div>
      </motion.div>
    </section>
  );
>>>>>>> febadb6 (landing page)
}
