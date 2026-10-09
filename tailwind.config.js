/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        ink2: '#121212',
        ink3: '#1c1c1c',
        line: 'rgba(255,255,255,0.12)',
        line2: 'rgba(255,255,255,0.06)',
        paper: '#f2f2ef',
        mute: '#a1a19b',
        dim: '#6f6f6a',
        signal: '#c6ef3f',
        signalDeep: '#9bc31a',
      },
      fontFamily: {
        mono: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['"Anton SC"', 'Impact', 'sans-serif'],
      },
      maxWidth: { wrap: '1320px' },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        inout: 'cubic-bezier(0.77, 0, 0.175, 1)',
      },
      keyframes: {
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: { blink: 'blink 1s steps(2) infinite' },
    },
  },
  plugins: [],
}
