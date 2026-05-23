import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';
import { ImovelAtivoProvider } from './lib/ImovelAtivoContext.jsx';
import { PerfisFiscaisProvider } from './lib/PerfisFiscaisContext.jsx';

// Story 019.9 — BrowserRouter wraps the app for URL-based routing.
// SPA fallback: vercel.json rewrites /(.*) → /index.html para deep linking funcionar.
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <ImovelAtivoProvider>
        <PerfisFiscaisProvider>
          <App />
        </PerfisFiscaisProvider>
      </ImovelAtivoProvider>
    </AuthProvider>
  </BrowserRouter>
);
