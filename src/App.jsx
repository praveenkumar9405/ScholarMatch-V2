import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import ScholarshipDetailPage from './pages/ScholarshipDetailPage';
import ProfilePage from './pages/ProfilePage';
import DocumentVaultPage from './pages/DocumentVaultPage';
import TrackerPage from './pages/TrackerPage';
import { SakhiChat } from './components/SakhiChat';
import { LanguageProvider } from './i18n/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="min-h-screen bg-background text-text font-sans selection:bg-primary selection:text-white relative">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/scholarship/:id" element={<ScholarshipDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/vault" element={<DocumentVaultPage />} />
              <Route path="/tracker" element={<TrackerPage />} />
            </Routes>
          </main>
          
          {/* Sakhi Chat Widget floats globally */}
          <SakhiChat />
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
