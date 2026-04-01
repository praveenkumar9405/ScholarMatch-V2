import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, IndianRupee, MapPin, GraduationCap, Calendar, ArrowLeft, ArrowUpRight, Loader2, Link as LinkIcon, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { DUMMY_SCHOLARSHIPS } from '../data/scholarships';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';

const ScholarshipDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scholarship, setScholarship] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isTracking, setIsTracking] = useState(() => {
    const tracked = JSON.parse(localStorage.getItem('tracked_scholarships') || '[]');
    return tracked.includes(String(id));
  });

  const toggleTrack = () => {
    setIsTracking(prev => {
      const newState = !prev;
      let tracked = JSON.parse(localStorage.getItem('tracked_scholarships') || '[]');
      if (newState) tracked.push(String(id));
      else tracked = tracked.filter(t => t !== String(id));
      localStorage.setItem('tracked_scholarships', JSON.stringify(tracked));
      return newState;
    });
  };

  useEffect(() => {
    loadScholarship();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadScholarship = async () => {
    // UUID regex to detect if the route param is a real Supabase UUID or a local dummy ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (isUUID) {
      try {
        const { data, error } = await supabase
          .from('scholarships')
          .select('*')
          .eq('id', id)
          .single();
          
        if (!error && data) {
           setScholarship(data);
           setLoading(false);
           return;
        }
      } catch (e) {
        console.warn("Supabase fetch failed for detail page. Falling back.", e);
      }
    }
    
    // Fallback to local data
    const localSch = DUMMY_SCHOLARSHIPS.find(s => String(s.id) === String(id));
    setScholarship(localSch || null);
    setLoading(false);
  };

  if (loading) {
     return (
        <div className="min-h-[calc(100vh-64px)] bg-[#F5F5F7] flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-bounce border border-gray-100">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        </div>
     );
  }

  if (!scholarship) {
     return <div className="flex flex-col items-center justify-center min-h-[80vh] bg-[#F5F5F7] text-center">
       <AlertCircle className="w-16 h-16 text-text/30 mb-6" />
       <h2 className="text-3xl font-extrabold tracking-tight">Opportunity Unavailable</h2>
       <p className="text-xl text-text/60 mt-4 max-w-sm cursor-pointer hover:underline" onClick={() => navigate(-1)}>Return to your dashboard</p>
     </div>;
  }

  const benefits = Array.isArray(scholarship.benefits) 
    ? scholarship.benefits 
    : (scholarship.description 
      ? [scholarship.description] 
      : ['Financial aid full tuition waiver', '1-on-1 Mentorship and guidance', 'Direct bank transfer every semester']);
  const documents = Array.isArray(scholarship.documents_needed) 
    ? scholarship.documents_needed 
    : (Array.isArray(scholarship.documents) 
      ? scholarship.documents 
      : ['Income Certificate', 'Aadhar Card', 'Previous Year Marksheet', 'Admission Proof / Fee Receipt']);
  const applyUrl = scholarship.apply_link || '#';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F5F5F7] pb-40 relative">
      {/* Immersive Header */}
      <div className="bg-white border-b border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-primary/5 via-primary/5 to-transparent rounded-full blur-3xl mix-blend-multiply opacity-50 -translate-y-1/2 translate-x-1/3 z-0"></div>
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-3xl opacity-30 z-0"></div>
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-16 relative z-10 w-full">
          <button onClick={() => navigate(-1)} className="text-text/60 hover:text-black hover:bg-gray-100 px-5 py-2.5 rounded-full transition-all flex items-center gap-2 font-bold mb-8 text-sm shadow-sm ring-1 ring-gray-100 w-max bg-white">
            <ArrowLeft className="w-4 h-4" /> Back to matches
          </button>

          <img src={`https://source.unsplash.com/random/1200x400/?${encodeURIComponent(scholarship.course || 'university')},education`} alt="Banner" className="w-full h-[300px] object-cover rounded-[3rem] shadow-2xl mb-10 transition-all hover:scale-[1.01]" />
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex justify-between items-center mb-6">
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 font-bold px-4 py-1.5 rounded-full text-sm uppercase tracking-wider shadow-sm ring-1 ring-green-100">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> 100% Match
              </div>
              <button 
                onClick={toggleTrack} 
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${isTracking ? 'bg-primary text-white ring-2 ring-primary/20' : 'bg-white text-text ring-1 ring-gray-200 hover:bg-gray-50'}`}
              >
                {isTracking ? "★ Tracking Active" : "Track Scholarship"}
              </button>
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-text mb-8 leading-[1.05]">
              {scholarship.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-2">
               <div className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm text-text px-5 py-3 rounded-2xl font-bold text-lg">
                  <div className="bg-primary/10 p-2 rounded-xl text-primary"><IndianRupee className="w-5 h-5" /></div> 
                  {scholarship.amount ? `₹${Number(scholarship.amount).toLocaleString()}` : 'Variable Amount'}
               </div>
               <div className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm text-text px-5 py-3 rounded-2xl font-bold text-lg">
                  <div className="bg-orange-50 p-2 rounded-xl text-orange-500"><Calendar className="w-5 h-5" /></div> 
                  Depletes: {new Date(scholarship.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
               </div>
               <div className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm text-text px-5 py-3 rounded-2xl font-bold text-lg">
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-500"><MapPin className="w-5 h-5" /></div> 
                  {scholarship.state === 'all' ? 'All India' : scholarship.state}
               </div>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Eligibility Section */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <h2 className="text-3xl font-extrabold mb-6 tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-[1rem] shadow-sm flex items-center justify-center border border-gray-100"><GraduationCap className="text-primary w-6 h-6" /></div>
              Complete Eligibility
            </h2>
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-gray-100">
               <p className="text-text/70 text-xl leading-relaxed font-medium">
                 {scholarship.eligibility_text || "To be eligible for this grant, you must be a dedicated student pursuing a full-time degree. You must strictly adhere to the demographic and socioeconomic requirements outlined by the principal donor trust."}
               </p>
               <div className="grid sm:grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-text/40 font-bold uppercase tracking-wider text-xs mb-1">Required Income</span>
                    <span className="text-lg font-bold">{'<'} ₹{scholarship.income_limit ? Number(scholarship.income_limit).toLocaleString() : '2,50,000'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-text/40 font-bold uppercase tracking-wider text-xs mb-1">Required Course</span>
                    <span className="text-lg font-bold">{scholarship.course || 'All Approved Degrees'}</span>
                  </div>
               </div>
            </div>
          </motion.section>

          {/* Benefits Section */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <h2 className="text-3xl font-extrabold mb-6 tracking-tight">Key Benefits</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {benefits.map((benefit, i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] shadow-[0_4px_30px_rgb(0,0,0,0.02)] border border-gray-100 flex items-start gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-shadow">
                  <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0 mt-1" />
                  <span className="text-text/80 font-bold text-lg leading-tight">{benefit}</span>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
           <motion.section initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full"></div>
             <FileText className="w-10 h-10 text-white/50 mb-6" />
             <h3 className="text-2xl font-extrabold mb-8 tracking-tight text-white">Required Documents Vault</h3>
             <ul className="space-y-4 relative z-10">
               {documents.map((doc, i) => (
                 <li key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                   <span className="text-white/90 font-bold text-sm tracking-wide">{doc}</span>
                   <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                 </li>
               ))}
             </ul>
             <p className="text-white/40 text-xs mt-6 font-semibold uppercase tracking-widest text-center">Ensure all files are PDF format</p>
           </motion.section>
        </div>
      </main>

      {/* Sticky Bottom Action Bar */}
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.5 }} className="fixed bottom-0 left-0 w-full z-50 p-6 pointer-events-none">
         <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-3xl p-4 rounded-full shadow-[0_10px_50px_rgba(0,0,0,0.15)] border border-gray-200/50 flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto ring-1 ring-black/5">
            <div className="hidden sm:block pl-6">
               <p className="text-sm font-bold tracking-tight text-text/50 uppercase">Ready?</p>
               <p className="text-xl font-extrabold tracking-tight">Submit your application</p>
            </div>
            <a href={applyUrl || '#'} target="_blank" rel="noopener noreferrer" className="block w-full sm:w-auto">
              <Button onClick={() => !isTracking && toggleTrack()} className="w-full sm:w-auto px-10 py-5 text-xl font-bold flex items-center justify-center gap-3 bg-black text-white hover:bg-gray-900 transition-all !rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:scale-105 active:scale-95">
                Apply & Track <ChevronRight className="w-6 h-6" />
              </Button>
            </a>
         </div>
      </motion.div>
    </div>
  );
};
export default ScholarshipDetailPage;
