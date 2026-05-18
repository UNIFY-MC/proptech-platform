import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import SwarmPage from './views/SwarmPage.jsx';
import DiscoveriesPage from './views/DiscoveriesPage.jsx';
import NichesPage from './views/NichesPage.jsx';
import StudioPage from './views/StudioPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/swarm" replace />} />
        <Route element={<Layout />}>
          <Route path="/swarm" element={<SwarmPage />} />
          {/* /swarm/discoveries — alias canónico; /discoveries mantém-se por compatibilidade */}
          <Route path="/swarm/discoveries" element={<DiscoveriesPage />} />
          <Route path="/discoveries" element={<DiscoveriesPage />} />
          <Route path="/niches" element={<NichesPage />} />
          <Route path="/studio" element={<StudioPage />} />
        </Route>
        {/* fallback */}
        <Route path="*" element={<Navigate to="/swarm" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
