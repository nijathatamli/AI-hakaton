type Props = { className?: string }

export default function Logo({ className = '' }: Props) {
  return (
    <a href="#top" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="PlayerOne, back to top">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-signal text-ink transition-transform duration-150 ease-out group-active:scale-95">
        <span className="font-display text-[15px] leading-none">P1</span>
      </span>
      <span className="font-display text-xl uppercase tracking-[0.02em]">PlayerOne</span>
    </a>
  )
}
