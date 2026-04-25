import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ImovelAtivoProvider } from './lib/ImovelAtivoContext.jsx';
import { PerfisFiscaisProvider } from './lib/PerfisFiscaisContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ImovelAtivoProvider>
    <PerfisFiscaisProvider>
      <App />
    </PerfisFiscaisProvider>
  </ImovelAtivoProvider>
);
