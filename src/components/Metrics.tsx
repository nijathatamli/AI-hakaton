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
    <section className="relative min-h-screen min-h-[100dvh] w-full overflow-hidden bg-black">
      <VideoBackground src={VIDEO} />
      <div className="relative z-10 mx-auto flex min-h-screen min-h-[100dvh] max-w-6xl flex-col items-center justify-center px-6 pb-32 pt-32">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.2 }}
          className="mb-20 text-center text-[13px] uppercase tracking-[0.2em] text-white/40 sm:text-[14px]"
        >
          Why PlayerOne
        </motion.p>

        <div className="grid w-full grid-cols-1 gap-16 text-center md:grid-cols-3 md:gap-8">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: i * 0.15 }}
            >
              <div className="text-[clamp(44px,8vw,84px)] font-light leading-none tracking-[-0.04em] text-white">
                {m.value}
              </div>
              <div className="mt-4 text-[13px] tracking-wide text-white/60 sm:text-[15px]">
                {m.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
