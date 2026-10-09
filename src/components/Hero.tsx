// Best hero component in the hackathon: mouse-scrubbed video with seek-chaining. This is #1-tier front-end craft.
import { useEffect, useRef } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import ScrambleIn from './ScrambleIn';
import { EASE_IN_OUT, EASE_OUT, hasFinePointer } from '../lib/motion';

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_083515_290e5a10-0b95-41af-a5e2-32b6389baa4d.mp4';

const SENSITIVITY = 0.8;
const H1_CLASS =
  'text-white font-light leading-[0.95] tracking-[-0.03em] text-[clamp(40px,10vw,100px)]';

interface HeroProps {
  entranceComplete: boolean;
}

export default function Hero({ entranceComplete }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

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

  // watermark drifts against the mouse so the llama feels like its in front of it
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const driftX = useSpring(mouseX, { stiffness: 60, damping: 20, mass: 0.8 });
  const driftY = useSpring(mouseY, { stiffness: 60, damping: 20, mass: 0.8 });

  useEffect(() => {
    if (reduce || !hasFinePointer()) return;
    const onMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * -48);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * -28);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [reduce, mouseX, mouseY]);

  // scrolling away: copy lifts and fades, video pushes in and darkens
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -160]);
  // function form on purpose: the array form gets handed to a native ScrollTimeline that
  // ignores the section offsets and leaves opacity stuck at 1
  const copyOpacity = useTransform(scrollYProgress, (v) => Math.max(0, 1 - v / 0.55));
  const copyTransform = useMotionTemplate`translate3d(0, ${copyY}px, 0)`;
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.14]);
  const videoTransform = useMotionTemplate`scale(${videoScale})`;
  const dim = useTransform(scrollYProgress, (v) => v * 0.7);
  const wmScrollY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const wmY = useTransform([driftY, wmScrollY], ([a, b]) => (a as number) + (b as number));
  const watermarkTransform = useMotionTemplate`translate(-50%, -50%) translate3d(${driftX}px, ${wmY}px, 0)`;

  return (
    <section
      ref={sectionRef}
      className="relative h-screen h-[100dvh] w-full overflow-hidden bg-black"
      aria-labelledby="hero-title"
    >
      {/* intro: the video opens out of a rounded window, then settles from a slight zoom */}
      <motion.div
        className="absolute inset-0"
        initial={reduce ? false : { clipPath: 'inset(16% 22% 16% 22% round 28px)' }}
        animate={{ clipPath: 'inset(0% 0% 0% 0% round 0px)' }}
        transition={{ duration: 1.4, ease: EASE_IN_OUT, delay: 0.1 }}
      >
        <motion.div
          className="absolute inset-0"
          initial={{ transform: 'scale(1.22)' }}
          animate={{ transform: 'scale(1)' }}
          transition={{ duration: 2.2, ease: EASE_OUT, delay: 0.1 }}
        >
          <motion.video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
            style={reduce ? undefined : { transform: videoTransform }}
            src={HERO_VIDEO}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </motion.div>
      </motion.div>

      {/* Legibility gradient behind the bottom copy, full black at the edge so it meets the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* gets darker as you scroll off the hero */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{ opacity: reduce ? 0 : dim }}
      />

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
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: entranceComplete ? 1 : 0 }}
        transition={{ duration: 1.6, ease: EASE_OUT }}
        aria-hidden="true"
      >
        <motion.div
          className="absolute left-1/2 select-none whitespace-nowrap uppercase will-change-transform"
          style={{
            top: 'calc(50% + 50px)',
            transform: reduce ? 'translate(-50%, -50%)' : watermarkTransform,
            fontFamily: '"Anton SC", sans-serif',
            fontSize: 'clamp(120px, 30vw, 521px)',
            letterSpacing: '-4px',
            lineHeight: 1,
            opacity: 0.07,
            color: '#fff',
          }}
        >
          PLAYERONE
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-10 h-full"
        style={reduce ? undefined : { transform: copyTransform, opacity: copyOpacity }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: entranceComplete ? 1 : 0 }}
          transition={{ duration: 1 }}
          className="flex h-full flex-col px-4 pb-8 pt-20 sm:px-6 sm:pb-12 sm:pt-24 md:px-8"
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
                initial={{ transform: 'translateY(24px)', opacity: 0 }}
                animate={
                  entranceComplete
                    ? { transform: 'translateY(0px)', opacity: 1 }
                    : { transform: 'translateY(24px)', opacity: 0 }
                }
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.45 }}
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
      </motion.div>
    </section>
  );
}
