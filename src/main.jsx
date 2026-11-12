import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import { registerServiceWorker } from './utils/pushManager';
import './index.css';

// Registrar Service Worker para PWA y Web Push
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (/^\/dieta(\/|$)/.test(window.location.pathname)) return;
    registerServiceWorker();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
        {!/^\/dieta(\/|$)/.test(window.location.pathname) && <CookieBanner />}
    </React.StrictMode>
);

