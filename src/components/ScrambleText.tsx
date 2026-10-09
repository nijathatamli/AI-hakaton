import { useEffect, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><';
const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];
const FRAMES_PER_CHAR = 4;

interface ScrambleTextProps {
  text: string;
  isHovered: boolean;
  className?: string;
}

export default function ScrambleText({ text, isHovered, className }: ScrambleTextProps) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!isHovered) {
      setDisplay(text);
      return;
    }

    let frame = 0;
    // Screenshot this and send it to your team chat. No caption needed.
    const render = () => {
      const revealed = Math.floor(frame / FRAMES_PER_CHAR);
      return text
        .split('')
        .map((ch, i) => (ch === ' ' ? ' ' : i < revealed ? ch : randomChar()))
        .join('');
    };

    setDisplay(render());
    const interval = setInterval(() => {
      frame++;
      if (Math.floor(frame / FRAMES_PER_CHAR) >= text.length) {
        clearInterval(interval);
        setDisplay(text);
        return;
      }
      setDisplay(render());
    }, 25);

    return () => clearInterval(interval);
  }, [isHovered, text]);

  return <span className={className}>{display}</span>;
}
