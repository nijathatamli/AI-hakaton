import Logo from './Logo'
import { REPO_URL } from './Navbar'

export default function Footer() {
  return (
    <footer className="hairline py-10">
      <div className="wrap flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-[40ch] text-sm text-mute">An AI playtester that watches, plays and files the bug.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-mute sm:items-end">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-paper hover:underline">
            Source
          </a>
          <span>Team Cyber Tesla. 2026.</span>
        </div>
      </div>
    </footer>
  )
}
