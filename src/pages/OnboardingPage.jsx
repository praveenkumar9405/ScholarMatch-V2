import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft, FastForward, Loader2, Mail } from 'lucide-react';
import { InputField } from '../components/InputField';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialMode = params.get('mode') === 'login';

  const [step, setStep] = useState(1);
  const totalSteps = initialMode ? 1 : 4;
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLogin, setIsLogin] = useState(initialMode);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    });
  }, [navigate]);
  
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', gender: '', caste: '', income: '', state: '', course: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMsg(''); // Clear error on typing
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.email || !formData.password) return "Please enter both email and password.";
      if (!formData.email.includes('@')) return "Please enter a valid email address.";
      if (formData.password.length < 6) return "Password must be at least 6 characters.";
      return null;
    }
    if (step === 2) {
      if (!formData.name) return "Please enter your full name.";
      return null;
    }
    if (step === 3) {
      if (!formData.caste || !formData.income || !formData.state) return "Please complete all demographic fields.";
      return null;
    }
    if (step === 4) {
      if (!formData.course) return "Please select your current course.";
      return null;
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
       setErrorMsg(error);
       return;
    }
    setErrorMsg('');
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const handlePrev = () => {
    setStep(s => Math.max(s - 1, 1));
    setErrorMsg('');
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
      // It redirects to google and back, the session will be handled natively.
    } catch (err) {
      console.warn("Google OAuth setup not found. Falling back to Demo Mode...", err);
      // Fallback for demo
      localStorage.setItem('scholarMatch_user', JSON.stringify({
         email: 'demo_user@google.com',
         name: 'Demo Student',
         income: 200000,
         caste: 'General',
         state: 'Maharashtra',
         course: 'B.Tech',
         id: crypto.randomUUID()
      }));
      navigate('/dashboard');
    }
  };

  const handleLoginSubmit = async () => {
    const error = validateStep();
    if (error) {
       setErrorMsg(error);
       return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      navigate('/dashboard');
    } catch (err) {
      // Demo Fallback: If Supabase denies due to Email Confirmation or limits, check local session cache
      const stored = localStorage.getItem('scholarMatch_user');
      if (stored) {
         try {
           const parsed = JSON.parse(stored);
           if (parsed.email === formData.email && parsed.password === formData.password) {
              navigate('/dashboard');
              return;
           }
         } catch(e) { /* ignore parse error */ }
      }
      setErrorMsg(err.message || "Invalid login credentials.");
      setLoading(false);
    }
  };

  const handleSignupSubmit = async () => {
    const error = validateStep();
    if (error) {
       setErrorMsg(error);
       return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id || crypto.randomUUID();

      // 2. Save Profile details to 'users' table
      const profileData = {
        id: userId,
        name: formData.name,
        gender: formData.gender,
        caste: formData.caste,
        income: Number(formData.income),
        state: formData.state,
        course: formData.course,
      };

      const { error: dbError } = await supabase
        .from('users')
        .upsert(profileData);

      if (dbError) throw dbError;

      // Unconditionally save to local demo storage in case of Email unverified issues preventing session handshakes
      localStorage.setItem('scholarMatch_user', JSON.stringify({
        ...formData,
        id: userId,
        created_at: new Date().toISOString()
      }));

      navigate('/dashboard');

    } catch (err) {
      console.warn("Supabase failed (maybe placeholder credentials?). Falling back to Local Demo Mode.", err);
      // Fallback Strategy (Local Demo)
      localStorage.setItem('scholarMatch_user', JSON.stringify({
        ...formData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      }));
      navigate('/dashboard');
    }
  };

  const slideVariants = {
    enter: (direction) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]"></div>
         <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] border-primary/5 bg-blue-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-xl z-10">
        <div className="flex flex-col mb-8">
          {/* Progress bar (Only show for signup if past step 1) */}
          {(!isLogin && step > 1) && (
            <>
              <div className="flex justify-between items-center text-sm font-bold text-text/60 mb-3 uppercase tracking-wider">
                <span>{step === 2 ? 'Demographics' : step === 3 ? 'Eligibility Details' : 'Academics'}</span>
                <span>Step {step} of {totalSteps}</span>
              </div>
              <div className="flex gap-2 w-full">
                {[...Array(totalSteps)].map((_, i) => (
                  <div key={i} className={`h-2.5 rounded-full flex-1 transition-all duration-500 shadow-inner ${i + 1 <= step ? 'bg-gradient-to-r from-primary to-blue-500' : 'bg-gray-200'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-3xl p-8 md:p-14 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100/50 relative overflow-hidden">
          <AnimatePresence mode="wait" custom={1}>
            <motion.div
              key={step + (isLogin ? 'login' : 'signup')}
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "circOut", duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              {step === 1 && (
                <>
                  <div className="mb-6 text-center">
                     <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-[1.5rem] mx-auto text-white flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                        <Mail className="w-8 h-8"/>
                     </div>
                     <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                       {isLogin ? 'Welcome back' : 'Create Account'}
                     </h2>
                     <p className="text-text/50 font-medium text-lg">
                       {isLogin ? 'Enter your details to sign in.' : 'Your gateway to thousands of scholarships.'}
                     </p>
                  </div>
                  
                  <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="student@example.com" required />
                  <InputField label="Password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" required />

                  <div className="mt-2 flex flex-col gap-4">
                     {isLogin ? (
                        <Button onClick={handleLoginSubmit} disabled={loading} className="w-full flex items-center justify-center py-4 bg-black text-white hover:bg-gray-900 rounded-2xl shadow-xl text-lg font-bold">
                           {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Sign In'}
                        </Button>
                     ) : (
                        <Button onClick={handleNext} disabled={loading} className="w-full flex items-center justify-center py-4 bg-black text-white hover:bg-gray-900 rounded-2xl shadow-xl text-lg font-bold gap-2">
                           Continue <ArrowRight className="w-5 h-5" />
                        </Button>
                     )}
                     
                     <div className="relative flex py-4 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-semibold uppercase tracking-wider">Or</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                     </div>

                     <button onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-gray-200 text-text hover:bg-gray-50 rounded-2xl font-bold transition-all shadow-sm">
                       <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                       Continue with Google
                     </button>
                  </div>

                  <p className="text-center mt-6 text-sm font-medium text-text/60">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }} className="text-primary font-bold hover:underline">
                      {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                  </p>
                </>
              )}

              {(!isLogin && step === 2) && (
                <>
                  <div className="mb-4">
                     <h2 className="text-3xl font-bold tracking-tight mb-2">Let's get to know you</h2>
                     <p className="text-text/50 font-medium">We'll use this to match your profile.</p>
                  </div>
                  <InputField label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required />
                  <InputField label="Gender (Optional)" name="gender" type="select" value={formData.gender} onChange={handleChange} options={[
                    { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' }
                  ]} />
                </>
              )}

              {(!isLogin && step === 3) && (
                <>
                  <div className="mb-4">
                     <h2 className="text-3xl font-bold tracking-tight mb-2">Eligibility basics</h2>
                     <p className="text-text/50 font-medium">To filter correctly for your demographic.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Category / Caste" name="caste" type="select" value={formData.caste} onChange={handleChange} required options={[
                      { label: 'General', value: 'General' }, { label: 'OBC', value: 'OBC' }, { label: 'SC', value: 'SC' }, { label: 'ST', value: 'ST' }
                    ]} />
                    <InputField label="Annual Family Income (₹)" name="income" type="number" value={formData.income} onChange={handleChange} placeholder="e.g. 250000" required />
                    <InputField label="State of Domicile" name="state" type="select" value={formData.state} onChange={handleChange} required options={[
                       { label: 'Maharashtra', value: 'Maharashtra' }, { label: 'Delhi', value: 'Delhi' }, { label: 'Uttar Pradesh', value: 'Uttar Pradesh' }, { label: 'Karnataka', value: 'Karnataka' }, {label: 'All India', value: 'All India'}
                    ]} />
                    <InputField label="Disability Status" name="disability" type="select" value={formData.disability || 'No'} onChange={handleChange} required options={[
                       { label: 'None', value: 'No' }, { label: 'Physical', value: 'Physical' }, { label: 'Visual', value: 'Visual' }
                    ]} />
                  </div>
                  <div className="mt-2">
                    <InputField label="First Generation Graduate?" name="firstGen" type="select" value={formData.firstGen || 'No'} onChange={handleChange} required options={[
                       { label: 'No', value: 'No' }, { label: 'Yes', value: 'Yes' }
                    ]} />
                  </div>
                </>
              )}

              {(!isLogin && step === 4) && (
                <>
                  <div className="mb-4">
                     <h2 className="text-3xl font-bold tracking-tight mb-2">Education Details</h2>
                     <p className="text-text/50 font-medium">What are you currently studying?</p>
                  </div>
                  <InputField label="Current Course / Degree" name="course" type="select" value={formData.course} onChange={handleChange} required options={[
                    { label: 'B.Tech / Engineering', value: 'B.Tech' }, { label: 'B.Sc / Science', value: 'B.Sc' }, { label: 'B.Com / Commerce', value: 'B.Com' }, { label: 'School (Class 1-12)', value: 'School' }, { label: 'MBA', value: 'MBA' }
                  ]} />
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {errorMsg && <p className="text-red-500 text-sm mt-6 font-semibold bg-red-50 py-3 px-4 rounded-xl text-center border-red-100 border">{errorMsg}</p>}

          {(!isLogin && step > 1) && (
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
              <button onClick={handlePrev} className="p-3 text-text/50 hover:text-text hover:bg-gray-100 rounded-xl transition-all flex items-center gap-2 font-medium">
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
              
              {step < totalSteps ? (
                <Button onClick={handleNext} className="flex items-center gap-2 px-8 py-3.5 !rounded-full shadow-lg hover:shadow-primary/30">
                  Continue <ArrowRight className="w-5 h-5" />
                </Button>
              ) : (
                <Button onClick={handleSignupSubmit} disabled={loading} className="flex items-center gap-2 px-8 py-3.5 !rounded-full bg-black hover:bg-gray-900 text-white shadow-xl">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <FastForward className="w-5 h-5" />} Complete Match
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default OnboardingPage;
