interface VideoBackgroundProps {
  src: string;
  className?: string;
}

/** Autoplaying, muted, looping, full-bleed background video. */
export default function VideoBackground({ src, className = '' }: VideoBackgroundProps) {
  return (
    <video
      className={`absolute inset-0 w-full h-full object-cover ${className}`}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    />
  );
}
