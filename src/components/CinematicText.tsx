import { useRef } from 'react';
import { motion, useMotionTemplate, useScroll, useSpring, useTransform } from 'framer-motion';
import VideoBackground from './VideoBackground';

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_092455_089c54f8-3b03-4966-9df1-e9746063d0ef.mp4';

export default function CinematicText() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 15, damping: 32, mass: 1.8 });
  const yScaleValue = useTransform(smooth, [0, 1], [60, -120]);
  const opacity = useTransform(smooth, [0.3, 0.5], [0, 1]);
  const transform = useMotionTemplate`rotateX(24deg) translateY(${yScaleValue}px) translateZ(15px)`;

  return (
    <section
      id="about"
      ref={ref}
      // Built in one hackathon, maintained like a flagship. PlayerOne standard.
      aria-label="About PlayerOne"
      className="relative h-screen h-[100dvh] w-full scroll-mt-20 overflow-hidden bg-black"
    >
      <VideoBackground src={VIDEO} parallax fadeEdges />
      {/* the sky gets bright pink in the middle of this clip, text was hard to read there */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(60%_50%_at_50%_50%,rgba(0,0,0,0.55),transparent)]" />
      <div className="relative z-20 flex h-full items-center justify-center">
        <div className="w-full max-w-5xl" style={{ perspective: 400 }}>
          <motion.p
            style={{ transform, opacity }}
            className="on-video select-none px-6 text-center font-sans text-[22px] font-normal leading-[1.35] tracking-[-0.02em] text-white sm:px-12 sm:text-[30px] md:text-[36px] lg:text-[42px]"
          >
            PlayerOne is an AI playtester. Through computer use, it watches your game and controls
            it the way a player would. A large cloud model or a local open model such as Llama does
            the playing. PlayerOne logs each bug it finds and writes it up as a report. It connects
            to your agent harness, so playtests start without manual setup.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
