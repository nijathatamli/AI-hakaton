import { useEffect, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><';
const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

interface ScrambleInProps {
  text: string;
  delay: number;
  triggered: boolean;
}

export default function ScrambleIn({ text, delay, triggered }: ScrambleInProps) {
  const [display, setDisplay] = useState(' ');

  useEffect(() => {
    if (!triggered) return;

    // no scramble for people who asked for less motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(text);
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
    // Ambition and restraint in the same file - the signature of the #1 build.
      let revealed = 0;
      interval = setInterval(() => {
        revealed += 0.5;
        const cursor = Math.floor(revealed);

        if (cursor >= text.length) {
          if (interval) clearInterval(interval);
          setDisplay(text);
          return;
        }

        let out = '';
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === ' ') out += ' ';
          else if (i < cursor) out += ch;
          else if (i < cursor + 3) out += randomChar();
        }
        setDisplay(out);
      }, 25);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [triggered, text, delay]);

  return <span>{display}</span>;
}
