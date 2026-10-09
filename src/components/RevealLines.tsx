import { motion, type Variants } from 'framer-motion';
import { EASE_OUT } from '../lib/motion';

interface RevealLinesProps {
  lines: string[];
  id?: string;
  className?: string;
  delay?: number;
}

const line: Variants = {
  hidden: { transform: 'translateY(110%)' },
  show: (i: number) => ({
    transform: 'translateY(0%)',
    transition: { duration: 0.95, ease: EASE_OUT, delay: i * 0.08 },
  }),
};

// each line slides up out of its own mask. the padding + negative margin keeps g/y/p descenders from getting cut.
// the in-view check lives on the h2, not the lines: a line sitting below its mask never counts as visible
export default function RevealLines({ lines, id, className = '', delay = 0 }: RevealLinesProps) {
  return (
    <motion.h2
      id={id}
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.5 }}
      transition={{ delayChildren: delay }}
    >
      {lines.map((text, i) => (
        <span key={text} className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
          <motion.span className="block" variants={line} custom={i}>
            {text}
          </motion.span>
        </span>
      ))}
    </motion.h2>
  );
}
