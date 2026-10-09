import { motion, useReducedMotion } from 'framer-motion'

const POINTS = [
  {
    word: 'Local',
    title: 'Runs on open models',
    body: 'The vision loop works with Llama and other open models on your own machine. Your unreleased build never leaves the studio. Cloud models are optional, not required.',
  },
  {
    word: 'Fewer',
    title: 'Fewer tokens per minute of play',
    body: 'Screen capture and input go through the operating system. Only the frames that change reach the model, so the model reads less and the run costs less.',
  },
  {
    word: 'Auto',
    title: 'Attaches to the harness itself',
    body: 'Point it at a window or an executable. It finds the game, sizes the capture, and starts. No config file, no engine plugin, no hooks in your code.',
  },
]

export default function WhyLocal() {
  const reduce = useReducedMotion()
  return (
    <section id="local" className="scroll-mt-24 py-20 sm:py-28" aria-labelledby="local-title">
      <div className="wrap">
        <h2 id="local-title" className="eyebrowless-h2 max-w-[16ch]">
          Built to run where the build lives
        </h2>

        <div className="mt-14 sm:mt-20">
          {POINTS.map((p, i) => (
            <motion.div
              key={p.word}
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="hairline grid items-baseline gap-4 py-8 sm:py-10 lg:grid-cols-12"
            >
              <p className="display text-[clamp(3.5rem,11vw,9rem)] text-signal lg:col-span-5">{p.word}</p>
              <div className="lg:col-span-6 lg:col-start-7">
                <h3 className="text-lg font-bold text-paper sm:text-xl">{p.title}</h3>
                <p className="mt-2 max-w-[52ch] text-pretty text-base leading-relaxed text-mute">{p.body}</p>
              </div>
            </motion.div>
          ))}
          <div className="hairline" />
        </div>
      </div>
    </section>
  )
}
