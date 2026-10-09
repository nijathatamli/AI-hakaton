import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import VideoBackground from './VideoBackground';
import ScrambleIn from './ScrambleIn';
import { EASE_OUT } from '../lib/motion';

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095810_ecea3dd2-fc5e-4e41-8696-4219290b6589.mp4';

const METRICS = [
  { value: 'Local', label: 'Runs Llama and other open models on your machine' },
  { value: 'Fewer', label: 'Tokens used per playtest' },
  { value: 'Auto', label: 'Starts through your agent harness' },
];

export default function Metrics() {
  const gridRef = useRef<HTMLDivElement>(null);
  const inView = useInView(gridRef, { once: true, amount: 0.5 });

  return (
    <section
      id="why"
      aria-label="Why PlayerOne"
      className="relative min-h-screen min-h-[100dvh] w-full scroll-mt-20 overflow-hidden bg-black"
    >
      <VideoBackground src={VIDEO} parallax fadeEdges />
      {/* the llama's head sits right behind the middle column, so darken a band for the text */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[46%] -translate-y-1/2 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.55)_30%,rgba(0,0,0,0.55)_70%,transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-screen min-h-[100dvh] max-w-6xl flex-col items-center justify-center px-6 pb-32 pt-32">
        <div ref={gridRef} className="grid w-full grid-cols-1 gap-16 text-center md:grid-cols-3 md:gap-8">
          {METRICS.map((m, i) => (
            <div key={m.label}>
              {/* same scramble as the hero so the page speaks one motion language */}
              <p
                className="on-video min-h-[1em] text-[clamp(44px,8vw,84px)] font-light leading-none tracking-[-0.03em] text-white"
                aria-label={m.value}
              >
                <ScrambleIn text={m.value} delay={i * 180} triggered={inView} />
              </p>
              <motion.p
                initial={{ opacity: 0, transform: 'translateY(14px)' }}
                animate={inView ? { opacity: 1, transform: 'translateY(0px)' } : undefined}
                transition={{ duration: 0.8, delay: 0.25 + i * 0.18, ease: EASE_OUT }}
                className="on-video mx-auto mt-4 max-w-[26ch] text-[13px] leading-relaxed tracking-wide text-white/75 sm:text-[15px]"
              >
                {m.label}
              </motion.p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
