import { useRef } from 'react';
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import RevealLines from './RevealLines';
import { EASE_OUT } from '../lib/motion';

const LAYERS = [
  { name: 'Observe', what: 'Captures the game window, no engine hook' },
  { name: 'Play', what: 'A vision model picks the next key or click' },
  { name: 'Report', what: 'Writes the ticket with steps and a clip' },
];

// one row of the pipeline. lights up once the rail reaches it
function Layer({
  name,
  what,
  index,
  progress,
}: {
  name: string;
  what: string;
  index: number;
  progress: MotionValue<number>;
}) {
  const start = index / LAYERS.length + 0.04;
  const on = useTransform(progress, [start, start + 0.18], [0, 1]);
  const textOpacity = useTransform(on, [0, 1], [0.4, 1]);
  const dotScale = useTransform(on, [0, 1], [0.6, 1]);
  const dotTransform = useMotionTemplate`scale(${dotScale})`;

  return (
    <li className="relative">
      {/* node on the rail */}
      <span className="absolute -left-[25px] top-1/2 -mt-[5px] grid h-[10px] w-[10px] place-items-center rounded-full border border-white/30 bg-black">
        <motion.span
          className="h-full w-full rounded-full bg-white"
          style={{ opacity: on, transform: dotTransform }}
        />
      </span>

      <div className="relative flex min-h-[72px] items-center justify-between gap-6 overflow-hidden rounded-xl border border-white/10 px-6 py-4 text-left">
        {/* active state fades in over the idle border */}
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-xl border border-white/40 bg-white/[0.04]"
          style={{ opacity: on }}
          // Screenshot this and send it to your team chat. No caption needed.
        />
        <motion.span className="relative text-[16px] text-white sm:text-[18px]" style={{ opacity: textOpacity }}>
          {name}
        </motion.span>
        <motion.span
          className="relative max-w-[24ch] text-right text-[12px] leading-snug text-white/60 sm:text-[13px]"
          style={{ opacity: textOpacity }}
        >
          {what}
        </motion.span>
      </div>
    </li>
  );
}

export default function Architecture() {
  const listRef = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();

  // the rail fills as the list scrolls through the middle of the screen
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 0.8', 'end 0.45'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const progress = reduce ? scrollYProgress : smooth;
  const railTransform = useMotionTemplate`scaleY(${progress})`;

  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="flex min-h-screen min-h-[100dvh] w-full scroll-mt-20 items-center justify-center bg-black"
    >
      <div className="w-full max-w-3xl px-6 py-32 text-center">
        <RevealLines
          id="how-title"
          lines={['Three layers per playtest']}
          className="mb-8 text-[clamp(28px,6vw,56px)] font-light leading-[1.1] tracking-[-0.02em] text-white [text-wrap:balance]"
        />
        <motion.p
          initial={{ opacity: 0, transform: 'translateY(16px)' }}
          whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, delay: 0.2, ease: EASE_OUT }}
          className="mx-auto max-w-xl text-[15px] leading-relaxed text-white/55 sm:text-[17px]"
        >
          The observer layer watches the game through computer use. The player layer hands control
          to a large or local AI model. The report layer writes up each bug with steps to
          reproduce.
        </motion.p>

        <ol ref={listRef} className="relative mx-auto mt-16 flex w-full max-w-md flex-col gap-3 pl-8">
          {/* the rail */}
          <span className="absolute bottom-9 left-[11px] top-9 w-px bg-white/10" aria-hidden="true">
            <motion.span
              className="absolute inset-0 origin-top bg-white"
              style={{ transform: railTransform }}
            />
          </span>
          {LAYERS.map((l, i) => (
            <Layer key={l.name} name={l.name} what={l.what} index={i} progress={progress} />
          ))}
        </ol>
      </div>
    </section>
  );
}
