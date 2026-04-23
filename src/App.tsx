/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ERProvider } from './context/ERContext';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import { useEffect } from 'react';

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ERProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ERProvider>
  );
}

