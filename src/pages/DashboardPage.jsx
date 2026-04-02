import { useEffect, useState } from 'react';
import { ScholarshipCard } from '../components/ScholarshipCard';
import { matchScholarships } from '../utils/matchingEngine';
import { DUMMY_SCHOLARSHIPS } from '../data/scholarships';
import { Loader2, Search, UserCircle2, Sparkles, LogOut, Wallet, Award, ArrowUpRight, ClipboardList } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { useLanguage } from '../i18n/LanguageContext';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState('\u20B90');
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('all');

  useEffect(() => {
    supabaseLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateTotalValue = (matchedItems) => {
    const rawSum = matchedItems.reduce((acc, curr) => {
       const amt = Number(curr.amount);
       if (!isNaN(amt) && amt > 0) return acc + amt;
       return acc + 50000;
    }, 0);
    return rawSum >= 100000 ? `\u20B9${(rawSum / 100000).toFixed(1)}L+` : `\u20B9${rawSum.toLocaleString()}`;
  };

  const supabaseLoad = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionError && session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const { data: scholarships, error: scholarshipsError } = await supabase
          .from('scholarships')
          .select('*');

        if (profile && !profileError && scholarships && !scholarshipsError) {
          const calculatedMatches = matchScholarships(profile, scholarships);
          setUser(profile);
          setMatches(calculatedMatches);
          setTotalValue(calculateTotalValue(calculatedMatches));
          setLoading(false);
          return;
        }
      }
    } catch (e) {
       console.warn("Real Supabase fetch failed. Falling back to local data.", e);
    }
    
    const stored = localStorage.getItem('scholarMatch_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const localMatches = matchScholarships(parsed, DUMMY_SCHOLARSHIPS);
        setUser(parsed);
        setMatches(localMatches);
        setTotalValue(calculateTotalValue(localMatches));
      } catch(_e) { /* ignore */ }
    } else {
      navigate('/onboarding');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('scholarMatch_user');
    navigate('/');
  };

  if (loading) {
     return (
       <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-background gap-5 px-6 text-center">
         <div className="w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-[2rem] flex items-center justify-center shadow-[0_8px_30px_rgb(0,113,227,0.3)] animate-bounce ring-4 ring-primary/20">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
         </div>
         <h2 className="text-3xl font-extrabold tracking-tight text-text mt-4">Analyzing your demographic</h2>
         <p className="text-text/60 font-medium text-xl max-w-sm">Cross-referencing securely against <span className="text-black font-bold">10,000+</span> verified financial opportunities...</p>
       </div>
     );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F5F5F7] pb-24">
      {/* Premium Header */}
      <div className="bg-white border-b border-gray-100 py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center shrink-0 shadow-sm relative group">
              <div className="absolute inset-0 bg-primary/10 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
              <UserCircle2 className="w-14 h-14 text-text/80" />
            </div>
            <div className="pt-2">
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider mb-3">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> {t('dash_activeProfile')}
              </motion.div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-text mb-2 flex items-center gap-3">
                 {t('dash_greeting')} {user?.name?.split(' ')[0] || 'Student'} <Sparkles className="w-8 h-8 text-primary" />
              </h1>
              <p className="text-text/60 font-medium text-lg lg:text-xl">
                {t('dash_opportunities')} <span className="text-black font-bold">{user?.course || 'your'}</span> {t('dash_studentIn')} <span className="text-black font-bold">{user?.state || 'India'}</span>.
              </p>
            </div>
          </div>
          <div className="flex gap-4 self-start md:self-auto pt-4 md:pt-0">
            <Link to="/profile" className="px-6 py-3 rounded-full border border-gray-200 text-sm font-bold hover:bg-gray-50 hover:shadow-md transition-all shadow-sm bg-white hover:-translate-y-0.5 text-text">
              {t('dash_editDetails')}
            </Link>
            <button onClick={handleLogout} className="px-5 py-3 rounded-full border border-gray-200 text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all bg-white flex items-center justify-center text-text shadow-sm hover:shadow-md hover:-translate-y-0.5">
               <LogOut className="w-4 h-4 mr-2" /> {t('dash_signOut')}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
           <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mb-6 ring-1 ring-blue-100">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <p className="text-text/60 font-bold tracking-wide text-sm uppercase mb-1">{t('dash_eligibleMatches')}</p>
                <h3 className="text-4xl font-extrabold tracking-tight">{matches.length}</h3>
              </div>
           </motion.div>
           
           <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-[1.5rem] flex items-center justify-center mb-6 ring-1 ring-green-100">
                <Wallet className="w-7 h-7" />
              </div>
              <div>
                <p className="text-text/60 font-bold tracking-wide text-sm uppercase mb-1">{t('dash_potentialFunding')}</p>
                <h3 className="text-4xl font-extrabold tracking-tight text-green-600 flex items-center gap-2">{totalValue} <ArrowUpRight className="w-6 h-6 text-green-400"/></h3>
              </div>
           </motion.div>

           <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}} className="bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] p-8 border border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.1)] flex flex-col justify-between overflow-hidden relative group text-white">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="w-14 h-14 bg-white/10 text-white rounded-[1.5rem] flex items-center justify-center mb-6 ring-1 ring-white/20 backdrop-blur-md">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <p className="text-white/60 font-bold tracking-wide text-sm uppercase mb-1">{t('dash_profileStrength')}</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-4xl font-extrabold tracking-tight text-white">100%</h3>
                  <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full mb-1">{t('dash_verified')}</span>
                </div>
              </div>
           </motion.div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
           <div className="pl-2 border-l-4 border-primary">
              <h2 className="text-3xl font-extrabold tracking-tight">{t('dash_pipeline')}</h2>
           </div>
           <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-auto">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <input 
                   type="text" 
                   placeholder={t('dash_search')}
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   className="w-full sm:w-72 pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-all"
                 />
              </div>
              <div className="flex items-center p-1 bg-gray-200/50 rounded-full shrink-0 w-full sm:w-auto flex-wrap gap-1">
                <button onClick={() => setTab('all')} className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-bold transition-all ${tab === 'all' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>{t('dash_latestMatches')}</button>
                <button onClick={() => setTab('saved')} className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-bold transition-all ${tab === 'saved' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>{t('dash_savedTracked')}</button>
                <Link to="/tracker" className="flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-bold text-gray-500 hover:text-black flex items-center gap-1 justify-center transition-all"><ClipboardList className="w-3.5 h-3.5" />{t('dash_applied')}</Link>
              </div>
           </div>
        </div>

        {(() => {
          const trackedIds = JSON.parse(localStorage.getItem('tracked_scholarships') || '[]');
          const filteredMatches = matches.filter(m => {
             const textMatch = (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.course || '').toLowerCase().includes(searchQuery.toLowerCase());
             const tabMatch = tab === 'saved' ? trackedIds.includes(String(m.id)) : true;
             return textMatch && tabMatch;
          });

          if (filteredMatches.length > 0) {
            return (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence>
                  {filteredMatches.map((scholarship, index) => (
                    <ScholarshipCard key={scholarship.id} {...scholarship} index={index} />
                  ))}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-32 bg-white rounded-[3rem] border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.03)] px-6">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-gray-50/50">
                 <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-3xl font-extrabold text-text mb-4 tracking-tight">{t('dash_noMatches')}</h3>
              <p className="text-text/60 max-w-lg text-lg mx-auto leading-relaxed font-medium">{t('dash_noMatchesDesc')}</p>
              <button onClick={() => { setSearchQuery(''); setTab('all'); }} className="mt-8 px-8 py-4 bg-black text-white rounded-full font-bold shadow-xl hover:scale-105 transition-transform">{t('dash_clearFilters')}</button>
            </motion.div>
          );
        })()}
      </main>
    </div>
  );
};
export default DashboardPage;
