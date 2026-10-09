import { motion } from 'framer-motion';
import VideoBackground from './VideoBackground';

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095810_ecea3dd2-fc5e-4e41-8696-4219290b6589.mp4';

const METRICS = [
  { value: 'Local', label: 'Runs Llama and other open models on your machine' },
  { value: 'Fewer', label: 'Tokens used per playtest' },
  { value: 'Auto', label: 'Starts through your agent harness' },
];

export default function Metrics() {
  return (
    <section
      id="why"
      aria-label="Why PlayerOne"
      className="relative min-h-screen min-h-[100dvh] w-full scroll-mt-20 overflow-hidden bg-black"
    >
      <VideoBackground src={VIDEO} />
      {/* the llama's head sits right behind the middle column, so darken a band for the text */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[46%] -translate-y-1/2 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.55)_30%,rgba(0,0,0,0.55)_70%,transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-screen min-h-[100dvh] max-w-6xl flex-col items-center justify-center px-6 pb-32 pt-32">
        <div className="grid w-full grid-cols-1 gap-16 text-center md:grid-cols-3 md:gap-8">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: i * 0.12, ease: [0.23, 1, 0.32, 1] }}
            >
              <p className="on-video text-[clamp(44px,8vw,84px)] font-light leading-none tracking-[-0.03em] text-white">
                {m.value}
              </p>
              <p className="on-video mx-auto mt-4 max-w-[26ch] text-[13px] leading-relaxed tracking-wide text-white/75 sm:text-[15px]">
                {m.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
