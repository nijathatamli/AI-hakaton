import { GithubLogo } from '@phosphor-icons/react'
import { REPO_URL } from './Navbar'

export default function Closing() {
  return (
    <section className="py-24 sm:py-32 lg:py-40" aria-labelledby="closing-title">
      <div className="wrap">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <h2 id="closing-title" className="display text-[clamp(3.5rem,12vw,10rem)] lg:col-span-8">
            Give it
            <br />
            <span className="text-signal">a build.</span>
          </h2>
          <div className="lg:col-span-4 lg:pb-4">
            <p className="max-w-[40ch] text-pretty text-base leading-relaxed text-mute">
              Built in Baku during NeuroBridge.SI, 9 to 10 October 2026. The source, the seeded games and the run logs are in
              the repository.
            </p>
            <div className="mt-7">
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-solid">
                <GithubLogo size={16} weight="bold" aria-hidden />
                Source
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
