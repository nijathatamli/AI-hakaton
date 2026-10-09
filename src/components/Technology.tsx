import { motion } from 'framer-motion';
import VideoBackground from './VideoBackground';

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095750_32a52ce0-2005-45c9-9093-41f03fde9530.mp4';

const FEATURES = [
  { title: 'Computer use', desc: 'Sees the screen and uses the mouse and keyboard like a player.' },
  { title: 'Local models', desc: 'Runs Llama and other open models on your own hardware.' },
  { title: 'Bug reports', desc: 'Finds bugs and writes reports with steps to reproduce.' },
  { title: 'Harness hook', desc: 'Starts playtests automatically from your agent harness.' },
];

export default function Technology() {
  return (
    <section className="relative h-screen h-[100dvh] w-full overflow-hidden bg-black">
      <VideoBackground src={VIDEO} />
      <div className="relative z-10 flex h-full flex-col px-8 py-12 sm:px-12 sm:py-16 md:px-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.0 }}
            className="text-[clamp(36px,8vw,72px)] font-light leading-[0.95] tracking-[-0.03em] text-white"
          >
            Autonomous
            <br />
            playtesting
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.0, delay: 0.2 }}
            className="max-w-xs text-[13px] leading-relaxed text-white/70 sm:text-[15px] md:pt-2 md:text-right"
          >
            Connect PlayerOne to your agent harness and a playtest starts after every build. You
            choose a large cloud model or a local one.
          </motion.p>
        </div>

        <div className="flex-1" />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.0, delay: 0.3 }}
          className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
            >
              <h3 className="mb-2 text-[14px] font-normal text-white sm:text-[16px]">{f.title}</h3>
              <p className="text-[12px] leading-relaxed text-white/40 sm:text-[14px]">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
