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
    <section
      className="relative h-screen h-[100dvh] w-full overflow-hidden bg-black"
      aria-labelledby="hero-title"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={HERO_VIDEO}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
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
          opacity: 0.07,
          color: '#fff',
        }}
        aria-hidden="true"
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
            <h1 id="hero-title" className={H1_CLASS}>
              <ScrambleIn text="AI plays" delay={200} triggered={entranceComplete} />
              <br />
              <ScrambleIn text="your game" delay={500} triggered={entranceComplete} />
            </h1>
            <motion.p
              initial={{ y: 25, opacity: 0 }}
              animate={entranceComplete ? { y: 0, opacity: 1 } : { y: 25, opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.215, 0.61, 0.355, 1.0], delay: 0.2 }}
              className="on-video max-w-sm text-[13px] leading-relaxed text-white/75 sm:text-[15px]"
            >
              PlayerOne is an AI playtester. It watches your screen, plays your game, and writes the
              bug report. It runs on large cloud models or on local Llama models, which use fewer
              tokens.
            </motion.p>
          </div>

          {/* brand lockup, not a second heading */}
          <p className={`${H1_CLASS} text-left md:text-right`} aria-hidden="true">
            <ScrambleIn text="Player" delay={700} triggered={entranceComplete} />
            <br />
            <ScrambleIn text="One" delay={1000} triggered={entranceComplete} />
          </p>
        </div>
      </motion.div>
    </section>
  );
}
