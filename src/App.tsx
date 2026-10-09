import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CinematicText from './components/CinematicText';
import Metrics from './components/Metrics';
import Technology from './components/Technology';
import Architecture from './components/Architecture';
import Download from './components/Download';
import Footer from './components/Footer';
import { startSmoothScroll } from './lib/smoothScroll';

export default function App() {
  const [entranceComplete, setEntranceComplete] = useState(false);

  useEffect(() => startSmoothScroll(), []);

  useEffect(() => {
    // lines up with the hero clip opening, text lands as the video finishes expanding
    const t = setTimeout(() => setEntranceComplete(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    // reducedMotion="user" turns transform animations into instant jumps for people who asked for that
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-black text-white">
        <Navbar entranceComplete={entranceComplete} />
        <main>
          <Hero entranceComplete={entranceComplete} />
          <CinematicText />
          <Metrics />
          <Technology />
          <Architecture />
          <Download />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
