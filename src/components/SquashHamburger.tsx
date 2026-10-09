import { motion } from 'framer-motion';

interface SquashHamburgerProps {
  open: boolean;
  /** "md" = desktop (18x12, 1.5px bars), "sm" = mobile (15x10, 1.2px bars) */
  size?: 'md' | 'sm';
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 20 };

export default function SquashHamburger({ open, size = 'md' }: SquashHamburgerProps) {
  const width = size === 'md' ? 18 : 15;
  const height = size === 'md' ? 12 : 10;
  const bar = size === 'md' ? 1.5 : 1.2;
  const centerOffset = height / 2 - bar / 2;

  const barStyle = { height: bar, left: 0, right: 0 };

  return (
    <div className="relative" style={{ width, height }}>
      <motion.span
        className="absolute bg-white rounded-full"
        style={{ ...barStyle, top: 0 }}
        animate={open ? { rotate: 45, y: centerOffset } : { rotate: 0, y: 0 }}
        transition={SPRING}
      />
      <motion.span
        className="absolute bg-white rounded-full"
        style={{ ...barStyle, top: centerOffset }}
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={SPRING}
      />
      <motion.span
        className="absolute bg-white rounded-full"
        style={{ ...barStyle, bottom: 0 }}
        animate={open ? { rotate: -45, y: -centerOffset } : { rotate: 0, y: 0 }}
        transition={SPRING}
      />
    </div>
  );
}
