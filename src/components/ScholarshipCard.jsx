import { motion } from 'framer-motion';
import { Calendar, IndianRupee, ArrowRight, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useLanguage } from '../i18n/LanguageContext';

export const ScholarshipCard = ({ id, name, amount, deadline, score, apply_link, index = 0 }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (applied) return;
    setApplying(true);

    try {
      // Create application record in DB
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const trackingId = `SM-${Date.now().toString(36).toUpperCase()}`;
        
        // Insert application
        const { error: appError } = await supabase
          .from('applications')
          .insert({
            user_id: session.user.id,
            scholarship_id: id,
            status: 'applied',
            tracking_id: trackingId,
            submitted_at: new Date().toISOString(),
          });

        if (!appError) {
          // Insert timeline event
          const { data: appData } = await supabase
            .from('applications')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('scholarship_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (appData) {
            await supabase.from('application_timeline').insert({
              application_id: appData.id,
              status: 'applied',
              note: `Application submitted for ${name}. Tracking ID: ${trackingId}`,
            });
          }
        }
      } else {
        // Store locally for demo users
        const localApps = JSON.parse(localStorage.getItem('sm_applications') || '[]');
        localApps.push({
          id: crypto.randomUUID(),
          scholarship_id: id,
          scholarship: { name, amount, deadline, apply_link },
          status: 'applied',
          tracking_id: `SM-${Date.now().toString(36).toUpperCase()}`,
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('sm_applications', JSON.stringify(localApps));
      }

      setApplied(true);

      // Open external link if available
      if (apply_link && apply_link !== '#') {
        window.open(apply_link, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.warn('[ScholarshipCard] Apply error:', err);
      // Still open link even if DB fails
      if (apply_link && apply_link !== '#') {
        window.open(apply_link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(`/scholarship/${id}`);
      }
    } finally {
      setApplying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-hover hover:-translate-y-1 transition-all group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-4 gap-4">
        <h3 className="text-xl font-bold text-text leading-tight">{name}</h3>
        {score && (
          <div className="flex-shrink-0 flex items-center justify-center bg-success/10 text-success px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-success/20 whitespace-nowrap">
            {Math.round(score)}{t('card_match')}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 mb-8">
        <div className="flex items-center text-sm text-text/80 gap-2 font-medium">
          <IndianRupee className="w-5 h-5 text-primary bg-primary/10 p-1 rounded-full" />
          <span>{amount ? `₹${Number(amount).toLocaleString()}` : t('card_variableAmount')}</span>
        </div>
        <div className="flex items-center text-sm text-text/80 gap-2 font-medium">
          <Calendar className="w-5 h-5 text-gray-400 bg-gray-100 p-1 rounded-full" />
          <span>{deadline ? new Date(deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : t('card_ongoing')}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-5 border-t border-gray-50">
        <Link to={`/scholarship/${id}`} className="text-primary font-semibold text-sm hover:text-black flex items-center gap-1 group-hover:gap-2 transition-all">
          {t('card_viewDetailed')} <ArrowRight className="w-4 h-4" />
        </Link>
        <button 
          onClick={handleApply}
          disabled={applying}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all ${
            applied 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-text text-white hover:bg-primary hover:shadow-md'
          }`}
        >
          {applying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : applied ? (
            <><CheckCircle2 className="w-4 h-4" /> {t('tracker_applied')}</>
          ) : (
            <>{t('card_applyNow')} <ExternalLink className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>
    </motion.div>
  );
};
