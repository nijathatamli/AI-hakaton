import { Check, X } from '@phosphor-icons/react'

const FINDS = ['Crashes and thrown errors', 'Soft-locks and frozen screens', 'HUD that stops updating', 'Walls you can walk through', 'Buttons that do nothing']
const MISSES = ['Balance and difficulty', 'Bugs that need frame-perfect timing', 'Anything past where it manages to get', 'Multiplayer']

const PROTOCOL = [
  {
    title: 'Three engines, zero integration',
    body: 'A Godot platformer, an open-source desktop game and a browser game. The same tool runs on all three without touching their code.',
  },
  {
    title: 'Seeded bugs',
    body: 'We plant a crash, a soft-lock and a visual bug in each game, then count how many PlayerOne reports in a ten-minute run.',
  },
  {
    title: 'A baseline that mashes keys',
    body: 'A random-input bot runs the same ten minutes. If PlayerOne does not beat it, the model is not earning its tokens.',
  },
  {
    title: 'False alarms are listed too',
    body: 'Every report it files that is not a real bug goes in the results table. A tester that cries wolf gets ignored.',
  },
]

export default function Testing() {
  return (
    <section id="testing" className="scroll-mt-24 bg-ink2 py-20 sm:py-28" aria-labelledby="testing-title">
      <div className="wrap">
        <h2 id="testing-title" className="eyebrowless-h2 max-w-[14ch]">
          How we test the tester
        </h2>
        <p className="mt-6 max-w-[60ch] text-pretty text-base leading-relaxed text-mute">
          A playtester that only shows its wins is a demo. Here is the protocol, and what it is honest about.
        </p>

        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-8">
          <dl className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-7">
            {PROTOCOL.map((p) => (
              <div key={p.title}>
                <dt className="text-base font-bold text-paper">{p.title}</dt>
                <dd className="mt-2 max-w-[42ch] text-pretty text-sm leading-relaxed text-mute">{p.body}</dd>
              </div>
            ))}
          </dl>

          <div className="rounded-2xl border border-line bg-ink p-6 lg:col-span-5 lg:p-8">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-paper">What it finds</h3>
            <ul className="mt-3 space-y-2 text-sm text-paper/90">
              {FINDS.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-signal" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.08em] text-paper">What it misses</h3>
            <ul className="mt-3 space-y-2 text-sm text-mute">
              {MISSES.map((m) => (
                <li key={m} className="flex items-start gap-2.5">
                  <X size={16} weight="bold" className="mt-0.5 shrink-0 text-dim" aria-hidden />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
