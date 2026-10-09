import { motion } from 'framer-motion';

const LAYERS = [
  { n: 'Layer 1', name: 'Observe' },
  { n: 'Layer 2', name: 'Play' },
  { n: 'Layer 3', name: 'Report' },
];

export default function Architecture() {
  return (
    <section className="flex min-h-screen min-h-[100dvh] w-full items-center justify-center bg-black">
      <div className="w-full max-w-3xl px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.0 }}
        >
          <p className="mb-8 text-[13px] uppercase tracking-[0.2em] text-white/40 sm:text-[14px]">
            How it works
          </p>
          <h2 className="mb-10 text-[clamp(28px,6vw,56px)] font-light leading-[1.15] tracking-[-0.02em] text-white">
            Three layers per playtest
          </h2>
          <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-white/45 sm:text-[17px]">
            The observer layer watches the game through computer use. The player layer hands control
            to a large or local AI model. The report layer writes up each bug with steps to
            reproduce.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="mt-20 flex flex-col items-center gap-4"
        >
          {LAYERS.map((l) => (
            <div
              key={l.n}
              className="flex h-[72px] w-full max-w-md items-center justify-between rounded-lg border border-white/10 px-6"
            >
              <span className="text-[12px] uppercase tracking-[0.15em] text-white/30">{l.n}</span>
              <span className="text-[16px] font-light text-white sm:text-[18px]">{l.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
