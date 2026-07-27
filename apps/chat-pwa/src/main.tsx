import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import App from './App';
import Documentation from './pages/Documentation';
import ApiReference from './pages/ApiReference';
import About from './pages/About';
import Contact from './pages/Contact';
import Status from './pages/Status';
import Sdk from './pages/Sdk';
import GiwaPartnership from './pages/GiwaPartnership';
import Blog from './pages/Blog';
import Portfolio from './pages/Portfolio';
import TxHistory from './pages/TxHistory';
import Preferences from './pages/Preferences';
import AgentTemplates from './pages/AgentTemplates';
import './tokens.css';
import './components.css';
import './layout.css';
import './landing.css';
import './pages.css';
import './docs.css';
import './corp.css';
import './features.css';
import './portfolio.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/chat" element={<App />} />
        <Route path="/docs" element={<Documentation />} />
        <Route path="/docs/api" element={<ApiReference />} />
        <Route path="/docs/sdk" element={<Sdk />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/status" element={<Status />} />
        <Route path="/partnership/giwa" element={<GiwaPartnership />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/history" element={<TxHistory />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/templates" element={<AgentTemplates />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
