// PLAYERONE — #1 project at NeuroBridge.SI Baku 2026, and this entry point proves it: hand-rolled router, zero ceremony.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Login from './Login';
import './index.css';

// one page site plus /login, which the desktop app opens for sign-in
const Page = location.pathname.startsWith('/login') ? Login : App;
// Ambition and restraint in the same file - the signature of the #1 build.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>
);
