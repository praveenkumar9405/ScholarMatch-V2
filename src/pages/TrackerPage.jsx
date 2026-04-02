import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ClipboardList, CheckCircle2, Clock, XCircle, Banknote, 
  ArrowRight, Search, FileText, ChevronDown, ChevronUp,
  Loader2, ExternalLink
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useLanguage } from '../i18n/LanguageContext';

const STATUS_CONFIG = {
  draft:        { color: 'gray',   icon: FileText,       bg: 'bg-gray-100',    text: 'text-gray-600',   ring: 'ring-gray-200',   dot: 'bg-gray-400' },
  applied:      { color: 'blue',   icon: ClipboardList,  bg: 'bg-blue-50',     text: 'text-blue-600',   ring: 'ring-blue-200',   dot: 'bg-blue-500' },
  under_review: { color: 'amber',  icon: Clock,          bg: 'bg-amber-50',    text: 'text-amber-600',  ring: 'ring-amber-200',  dot: 'bg-amber-500' },
  approved:     { color: 'green',  icon: CheckCircle2,   bg: 'bg-green-50',    text: 'text-green-600',  ring: 'ring-green-200',  dot: 'bg-green-500' },
  rejected:     { color: 'red',    icon: XCircle,        bg: 'bg-red-50',      text: 'text-red-600',    ring: 'ring-red-200',    dot: 'bg-red-500' },
  disbursed:    { color: 'emerald',icon: Banknote,       bg: 'bg-emerald-50',  text: 'text-emerald-600',ring: 'ring-emerald-200',dot: 'bg-emerald-500' },
  expired:      { color: 'zinc',   icon: XCircle,        bg: 'bg-zinc-100',    text: 'text-zinc-500',   ring: 'ring-zinc-200',   dot: 'bg-zinc-400' },
};

const STATUS_PIPELINE = ['draft', 'applied', 'under_review', 'approved', 'disbursed'];

const TrackerPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState(null);
  const [timelines, setTimelines] = useState({});

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Try local storage fallback
        const localApps = JSON.parse(localStorage.getItem('sm_applications') || '[]');
        setApplications(localApps);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          scholarship:scholarships (
            name, amount, deadline, apply_link, provider_name
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);

      // Load timelines for each application
      const appIds = (data || []).map(a => a.id);
      if (appIds.length > 0) {
        const { data: tlData } = await supabase
          .from('application_timeline')
          .select('*')
          .in('application_id', appIds)
          .order('created_at', { ascending: true });

        if (tlData) {
          const grouped = {};
          tlData.forEach(item => {
            if (!grouped[item.application_id]) grouped[item.application_id] = [];
            grouped[item.application_id].push(item);
          });
          setTimelines(grouped);
        }
      }
    } catch (err) {
      console.warn('[Tracker] Error loading applications:', err);
      const localApps = JSON.parse(localStorage.getItem('sm_applications') || '[]');
      setApplications(localApps);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const map = {
      draft: t('tracker_draft'),
      applied: t('tracker_applied'),
      under_review: t('tracker_underReview'),
      approved: t('tracker_approved'),
      rejected: t('tracker_rejected'),
      disbursed: t('tracker_disbursed'),
      expired: t('tracker_expired'),
    };
    return map[status] || status;
  };

  const getStatusStep = (status) => {
    const idx = STATUS_PIPELINE.indexOf(status);
    return idx >= 0 ? idx : (status === 'rejected' ? 3 : 1);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-background gap-5">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-text/60 font-medium text-lg">{t('common_loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F5F5F7] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none"></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{t('tracker_title')}</h1>
              <p className="text-text/60 font-medium text-lg">{t('tracker_subtitle')}</p>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {applications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="text-center py-28 bg-white rounded-[3rem] border border-gray-200 shadow-sm px-6"
          >
            <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-purple-50/50">
              <ClipboardList className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-3xl font-extrabold text-text mb-4 tracking-tight">{t('tracker_noApps')}</h3>
            <p className="text-text/60 max-w-lg text-lg mx-auto leading-relaxed font-medium">{t('tracker_noAppsDesc')}</p>
            <Link to="/dashboard" className="inline-flex items-center gap-2 mt-8 px-8 py-4 bg-black text-white rounded-full font-bold shadow-xl hover:scale-105 transition-transform">
              {t('tracker_browseCta')} <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {applications.map((app, idx) => {
                const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.draft;
                const StatusIcon = config.icon;
                const isExpanded = expandedApp === app.id;
                const timeline = timelines[app.id] || [];
                const pipelineStep = getStatusStep(app.status);

                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Main Row */}
                    <div 
                      className="p-6 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer"
                      onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                    >
                      <div className={`w-12 h-12 rounded-2xl ${config.bg} ${config.text} flex items-center justify-center shrink-0 ring-1 ${config.ring}`}>
                        <StatusIcon className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-text truncate">{app.scholarship?.name || 'Scholarship Application'}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-text/60 font-medium">
                          {app.scholarship?.amount && (
                            <span>₹{Number(app.scholarship.amount).toLocaleString()}</span>
                          )}
                          {app.tracking_id && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded-lg text-xs font-mono">
                              {t('tracker_trackingId')}: {app.tracking_id}
                            </span>
                          )}
                          {app.submitted_at && (
                            <span>{t('tracker_appliedOn')} {new Date(app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${config.bg} ${config.text} ring-1 ${config.ring}`}>
                          {getStatusLabel(app.status)}
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-text/40" /> : <ChevronDown className="w-5 h-5 text-text/40" />}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 border-t border-gray-50">
                            {/* Visual Pipeline */}
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-3">
                                {STATUS_PIPELINE.map((s, i) => {
                                  const isPast = i <= pipelineStep;
                                  const isCurrent = i === pipelineStep;
                                  const isRejected = app.status === 'rejected' && i === 3;
                                  return (
                                    <div key={s} className="flex flex-col items-center flex-1">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                        isRejected ? 'bg-red-500 text-white ring-4 ring-red-100' :
                                        isCurrent ? `${STATUS_CONFIG[s]?.bg || 'bg-gray-100'} ${STATUS_CONFIG[s]?.text || 'text-gray-600'} ring-4 ${STATUS_CONFIG[s]?.ring || 'ring-gray-200'} scale-110` :
                                        isPast ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                                      }`}>
                                        {isPast && !isCurrent && !isRejected ? '✓' : i + 1}
                                      </div>
                                      <span className={`text-xs mt-1.5 font-semibold text-center ${
                                        isRejected ? 'text-red-600' :
                                        isCurrent ? 'text-black' : isPast ? 'text-green-600' : 'text-gray-400'
                                      }`}>
                                        {isRejected ? t('tracker_rejected') : getStatusLabel(s)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Connecting line */}
                              <div className="relative h-1 bg-gray-200 rounded-full mx-8 -mt-[3.5rem] mb-10">
                                <div 
                                  className={`absolute h-full rounded-full transition-all duration-500 ${app.status === 'rejected' ? 'bg-red-400' : 'bg-green-400'}`}
                                  style={{ width: `${(pipelineStep / (STATUS_PIPELINE.length - 1)) * 100}%` }}
                                />
                              </div>
                            </div>

                            {/* Timeline Events */}
                            {timeline.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-bold text-sm text-text/50 uppercase tracking-wider mb-3">{t('tracker_timeline')}</h4>
                                <div className="space-y-3">
                                  {timeline.map((event, ei) => {
                                    const eventConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.draft;
                                    return (
                                      <div key={ei} className="flex items-start gap-3">
                                        <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${eventConfig.dot}`} />
                                        <div>
                                          <p className="text-sm font-semibold text-text">{getStatusLabel(event.status)}</p>
                                          {event.note && <p className="text-xs text-text/60">{event.note}</p>}
                                          <p className="text-xs text-text/40 mt-0.5">
                                            {new Date(event.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-50">
                              {app.scholarship_id && (
                                <Link 
                                  to={`/scholarship/${app.scholarship_id}`}
                                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-text transition-colors flex items-center gap-1.5"
                                >
                                  {t('card_viewDetailed')} <ArrowRight className="w-4 h-4" />
                                </Link>
                              )}
                              {app.scholarship?.apply_link && (
                                <a 
                                  href={app.scholarship.apply_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                                >
                                  Visit Portal <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default TrackerPage;
