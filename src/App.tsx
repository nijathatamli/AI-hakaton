<<<<<<< HEAD
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Manifesto from './components/Manifesto'
import HowItWorks from './components/HowItWorks'
import ReportDemo from './components/ReportDemo'
import WhyLocal from './components/WhyLocal'
import Testing from './components/Testing'
import Closing from './components/Closing'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-signal focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <Manifesto />
        <HowItWorks />
        <ReportDemo />
        <WhyLocal />
        <Testing />
        <Closing />
      </main>
      <Footer />
    </>
  )
=======
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
    <div
      className="min-h-screen bg-black text-white"
      style={{ fontFamily: '"Space Mono", monospace' }}
    >
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
>>>>>>> febadb6 (landing page)
}
