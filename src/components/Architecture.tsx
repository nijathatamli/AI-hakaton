import { motion } from 'framer-motion';

const LAYERS = [
  { name: 'Observe', what: 'Captures the game window, no engine hook' },
  { name: 'Play', what: 'A vision model picks the next key or click' },
  { name: 'Report', what: 'Writes the ticket with steps and a clip' },
];

export default function Architecture() {
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="flex min-h-screen min-h-[100dvh] w-full scroll-mt-20 items-center justify-center bg-black"
    >
      <div className="w-full max-w-3xl px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        >
          <h2
            id="how-title"
            className="mb-8 text-[clamp(28px,6vw,56px)] font-light leading-[1.1] tracking-[-0.02em] text-white"
            style={{ textWrap: 'balance' }}
          >
            Three layers per playtest
          </h2>
          <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-white/55 sm:text-[17px]">
            The observer layer watches the game through computer use. The player layer hands control
            to a large or local AI model. The report layer writes up each bug with steps to
            reproduce.
          </p>
        </motion.div>

        <motion.ol
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mx-auto mt-16 flex w-full max-w-md flex-col gap-3"
        >
          {LAYERS.map((l, i) => (
            <motion.li
              key={l.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, delay: 0.35 + i * 0.08, ease: [0.23, 1, 0.32, 1] }}
              className="flex min-h-[72px] items-center justify-between gap-6 rounded-xl border border-white/10 px-6 py-4 text-left transition-colors hover:border-white/25"
            >
              <span className="text-[16px] text-white sm:text-[18px]">{l.name}</span>
              <span className="max-w-[24ch] text-right text-[12px] leading-snug text-white/45 sm:text-[13px]">
                {l.what}
              </span>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
