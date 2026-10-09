import { motion } from 'framer-motion';
import PlayerOneLogo from './PlayerOneLogo';
import VideoBackground from './VideoBackground';
import { REPO_URL } from './Navbar';
import { EASE_IN_OUT, EASE_OUT } from '../lib/motion';

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_080203_fd7f4f85-3a86-4837-8192-85e7bfe68e75.mp4';

const rise = (delay: number) => ({
  initial: { opacity: 0, transform: 'translateY(14px)' },
  whileInView: { opacity: 1, transform: 'translateY(0px)' },
  viewport: { once: true, amount: 0.6 },
  transition: { duration: 0.8, delay, ease: EASE_OUT },
});

export default function Footer() {
  return (
    <footer className="overflow-hidden bg-black">
      <div className="flex min-h-[400px] flex-col md:flex-row">
        {/* a black curtain lifts off the llama. its a sibling on purpose: clipping the video's parent
            would make the play-on-screen observer think the video is hidden */}
        <motion.div
          className="relative h-[300px] w-full md:h-auto md:w-1/2"
          initial="closed"
          whileInView="open"
          viewport={{ once: true, amount: 0.3 }}
        >
          <VideoBackground src={VIDEO} />
          <motion.div
            className="pointer-events-none absolute inset-0 bg-black"
            variants={{
              closed: { clipPath: 'inset(0% 0 0 0)' },
              open: { clipPath: 'inset(0% 0 100% 0)', transition: { duration: 1.2, ease: EASE_IN_OUT } },
            }}
          />
        </motion.div>
        <div className="flex w-full flex-col justify-between p-10 sm:p-16 md:w-1/2">
          <div>
            <motion.div className="mb-8 flex items-center gap-2.5" {...rise(0.3)}>
              <PlayerOneLogo size={18} className="text-white/70" />
              <span className="text-[15px] font-medium tracking-tight text-white/70">PlayerOne</span>
            </motion.div>
            <motion.p
              className="max-w-sm text-[14px] leading-relaxed text-white/50 sm:text-[15px]"
              {...rise(0.38)}
            >
              PlayerOne is an AI playtester for game developers. It runs more playtests on fewer
              tokens.
            </motion.p>
            <motion.a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block text-[14px] text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              {...rise(0.46)}
            >
              Source on GitHub
            </motion.a>
          </div>
          <motion.p className="mt-12 text-[12px] text-white/35" {...rise(0.54)}>
            © 2026 PlayerOne. Built in Baku by Cyber Tesla.
          </motion.p>
        </div>
      </div>
    </footer>
  );
}
