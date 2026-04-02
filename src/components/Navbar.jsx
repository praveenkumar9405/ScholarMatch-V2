import { Link, useLocation } from 'react-router-dom';
import { User, Bell, FolderHeart, ClipboardList, Globe } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

const Navbar = () => {
  const location = useLocation();
  const isAuthOrDashboardFlow = location.pathname !== '/' && location.pathname !== '/onboarding';
  const showGetStarted = location.pathname === '/';
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <nav className="sticky top-0 z-50 glass border-b border-gray-100/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center shadow-inner overflow-hidden">
            <img src="https://cdn-icons-png.flaticon.com/512/6956/6956805.png" alt="ScholarMatch" className="w-5 h-5 invert" />
          </div>
          ScholarMatch
        </Link>
        <div className="flex items-center gap-1.5">
          {/* Language Switcher — always visible */}
          <div className="relative">
            <button 
              onClick={() => { setShowLangMenu(!showLangMenu); setShowNotifications(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-black/5 text-text/70 hover:text-primary transition-colors text-sm font-semibold"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{currentLang.native}</span>
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-12 right-0 w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-2 overflow-hidden"
                >
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setShowLangMenu(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-primary/5 transition-colors flex items-center justify-between ${
                        language === lang.code ? 'text-primary bg-primary/5 font-bold' : 'text-text/80'
                      }`}
                    >
                      <span>{lang.label}</span>
                      <span className="text-xs text-text/40">{lang.native}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isAuthOrDashboardFlow && (
            <>
              <div className="relative">
                 <button onClick={() => { setShowNotifications(!showNotifications); setShowLangMenu(false); }} className="p-2.5 rounded-full hover:bg-black/5 text-text/70 hover:text-primary transition-colors flex items-center justify-center relative">
                   <Bell className="w-5 h-5" />
                   <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                 </button>
                 <AnimatePresence>
                   {showNotifications && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 p-4">
                        <h4 className="font-bold text-sm mb-3 text-text/50 uppercase tracking-widest px-2">Notifications</h4>
                        <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex items-start gap-3">
                           <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse"></div>
                           <div>
                             <p className="font-bold text-sm text-text">New Perfect Match Found!</p>
                             <p className="text-xs text-text/60 mt-1">HDFC Badhte Kadam Scholarship matches 100% of your profile. Apply within 7 days.</p>
                           </div>
                        </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
              <Link to="/tracker" className="p-2.5 rounded-full hover:bg-black/5 text-text/70 hover:text-primary transition-colors flex items-center justify-center" title={t('tracker_title')}>
                <ClipboardList className="w-5 h-5" />
              </Link>
              <Link to="/vault" className="p-2.5 rounded-full hover:bg-black/5 text-text/70 hover:text-primary transition-colors flex items-center justify-center">
                <FolderHeart className="w-5 h-5" />
              </Link>
              <Link to="/profile" className="p-2.5 rounded-full hover:bg-black/5 text-text/70 hover:text-primary transition-colors flex items-center justify-center">
                <User className="w-5 h-5" />
              </Link>
            </>
          )}
          {showGetStarted && (
            <div className="flex items-center gap-2">
              <Link to="/onboarding?mode=login" className="text-sm font-semibold hover:text-primary transition-colors px-4 py-2">
                {t('nav_login')}
              </Link>
              <Link to="/onboarding" className="bg-text text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:scale-105 transition-transform duration-200 shadow-xl shadow-black/10">
                {t('nav_getStarted')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
