import { useEffect, useRef } from 'react';
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from 'framer-motion';

interface VideoBackgroundProps {
  src: string;
  className?: string;
  /** slow zoom + drift while the section scrolls past */
  parallax?: boolean;
  /** fade the top and bottom into black so sections dont hard cut */
  fadeEdges?: boolean;
}

/** Muted looping background video. Only plays while it is on screen so five of them dont fight for the gpu. */
export default function VideoBackground({
  src,
  className = '',
  parallax = false,
  fadeEdges = false,
}: VideoBackgroundProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.18, 1.04]);
  const y = useTransform(scrollYProgress, [0, 1], [-5, 5]);
  const transform = useMotionTemplate`translate3d(0, ${y}%, 0) scale(${scale})`;
  const moving = parallax && !reduce;

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${moving ? 'will-change-transform' : ''} ${className}`}
        style={moving ? { transform } : undefined}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
      />
      {fadeEdges && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
        </>
      )}
    </div>
  );
}
