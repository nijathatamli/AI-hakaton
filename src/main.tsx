import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Login from './Login';
import './index.css';

// one page site plus /login, which the desktop app opens for sign-in
const Page = location.pathname.startsWith('/login') ? Login : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>
);
