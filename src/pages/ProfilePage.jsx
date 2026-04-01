import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { InputField } from '../components/InputField';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { Save, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authMode, setAuthMode] = useState('local'); // 'supabase' | 'local'
  const [formData, setFormData] = useState({
    id: '', name: '', gender: '', caste: '', income: '', state: '', course: ''
  });

  useEffect(() => {
    loadProfile();
  }, [navigate]);

  const loadProfile = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionError && session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setFormData(profile);
          setAuthMode('supabase');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Real Supabase fetch failed. Falling back to local data.', err);
    }
    
    // Fallback if Supabase fails or not logged in
    const stored = localStorage.getItem('scholarMatch_user');
    if (stored) {
      setFormData(JSON.parse(stored));
      setAuthMode('local');
    } else {
      navigate('/onboarding');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    if (authMode === 'supabase') {
      try {
         await supabase.from('users').upsert({
           id: formData.id,
           name: formData.name,
           gender: formData.gender,
           caste: formData.caste,
           income: Number(formData.income),
           state: formData.state,
           course: formData.course,
         });
      } catch (err) {
         console.error('Failed to update Supabase', err);
      }
    }
    
    // Always sync locally
    localStorage.setItem('scholarMatch_user', JSON.stringify(formData));
    setSaving(false);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('scholarMatch_user');
    navigate('/');
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background py-16 px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100 ring-1 ring-black/5">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Configure Profile</h1>
        <p className="text-text/60 mb-10 font-medium">Update your demographics to get fresh matches.</p>
        
        <div className="grid md:grid-cols-2 gap-5 mb-10">
           <InputField label="Full Name" name="name" value={formData.name} onChange={handleChange} />
           <InputField label="Gender" name="gender" type="select" value={formData.gender} onChange={handleChange} options={[
              { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' }
           ]} />
           <InputField label="Category / Caste" name="caste" type="select" value={formData.caste} onChange={handleChange} options={[
              { label: 'General', value: 'General' }, { label: 'OBC', value: 'OBC' }, { label: 'SC', value: 'SC' }, { label: 'ST', value: 'ST' }
           ]} />
           <InputField label="Annual Income (₹)" name="income" type="number" value={formData.income} onChange={handleChange} />
           <InputField label="State" name="state" type="select" value={formData.state} onChange={handleChange} options={[
                     { label: 'Maharashtra', value: 'Maharashtra' }, { label: 'Delhi', value: 'Delhi' }, { label: 'Uttar Pradesh', value: 'Uttar Pradesh' }, { label: 'Karnataka', value: 'Karnataka' }, {label: 'All India', value: 'All India'}
           ]} />
           <InputField label="Course" name="course" type="select" value={formData.course} onChange={handleChange} options={[
                    { label: 'B.Tech / Engineering', value: 'B.Tech' }, { label: 'B.Sc / Science', value: 'B.Sc' }, { label: 'B.Com / Commerce', value: 'B.Com' }, { label: 'School (Class 1-12)', value: 'School' }, { label: 'MBA', value: 'MBA' }
           ]} />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-4 items-center justify-between pt-8 border-t border-gray-100">
          <button onClick={handleLogout} className="text-red-500 font-bold hover:bg-red-50 px-6 py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 w-full sm:w-auto hover:ring-1 hover:ring-red-200">
             <LogOut className="w-5 h-5" /> Logout & Restart
          </button>
          
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 !rounded-2xl text-lg hover:shadow-lg hover:shadow-primary/30">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Check New Matches
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
export default ProfilePage;
