import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CinematicText from './components/CinematicText';
import Metrics from './components/Metrics';
import Technology from './components/Technology';
import Architecture from './components/Architecture';
import Footer from './components/Footer';

export default function App() {
  const [entranceComplete, setEntranceComplete] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntranceComplete(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar entranceComplete={entranceComplete} />
      <main>
        <Hero entranceComplete={entranceComplete} />
        <CinematicText />
        <Metrics />
        <Technology />
        <Architecture />
      </main>
      <Footer />
    </div>
  );
}
