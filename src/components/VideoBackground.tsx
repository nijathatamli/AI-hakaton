import { useEffect, useRef } from 'react';

interface VideoBackgroundProps {
  src: string;
  className?: string;
}

/** Muted looping background video. Only plays while it is on screen so five of them dont fight for the gpu. */
export default function VideoBackground({ src, className = '' }: VideoBackgroundProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
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

  return (
    <video
      ref={ref}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
}
