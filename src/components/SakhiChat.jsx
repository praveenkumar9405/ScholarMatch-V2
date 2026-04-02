import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User as UserIcon, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';

const SAKHI_LOGO = 'https://cdn-icons-png.flaticon.com/512/6956/6956805.png';

export const SakhiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Namaste! 🙏 I am Sakhi, your AI scholarship assistant. Ask me anything about scholarships, deadlines, or applications!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([
    'What scholarships am I eligible for?',
    'Show upcoming deadlines',
    'Help me with my application'
  ]);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [applications, setApplications] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load user context on mount
  useEffect(() => {
    const loadUserContext = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          const localUser = localStorage.getItem('sm_user_id');
          if (localUser) setUserId(localUser);
          return;
        }

        const uid = session.user.id;
        setUserId(uid);

        const { data: profileData } = await supabase
          .from('users')
          .select('name, state, caste, income, marks_12th, course, profile_pct')
          .eq('id', uid)
          .maybeSingle();
        if (profileData) setProfile(profileData);

        const { data: matchData } = await supabase
          .from('matches')
          .select(`
            score,
            scholarship:scholarships (
              name, amount, deadline, eligibility_text
            )
          `)
          .eq('user_id', uid)
          .eq('is_dismissed', false)
          .order('score', { ascending: false })
          .limit(5);

        if (matchData) {
          const formatted = matchData.map(m => ({
            name: m.scholarship?.name,
            amount: m.scholarship?.amount,
            deadline: m.scholarship?.deadline,
            eligibility_text: m.scholarship?.eligibility_text,
            score: m.score
          }));
          setMatches(formatted);
        }

        const { data: appData } = await supabase
          .from('applications')
          .select(`
            status,
            scholarship:scholarships ( name )
          `)
          .eq('user_id', uid);

        if (appData) {
          const formatted = appData.map(a => ({
            scholarship_name: a.scholarship?.name,
            status: a.status
          }));
          setApplications(formatted);
        }
      } catch (err) {
        console.warn('[SakhiChat] Could not load user context:', err);
      }
    };

    loadUserContext();
  }, []);

  const getHistory = useCallback(() => {
    const recent = messages.slice(-10);
    return recent.map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text
    }));
  }, [messages]);

  const sendToSakhi = async (messageText) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    let accessToken = anonKey;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        accessToken = session.access_token;
      }
    } catch {
      // continue with anon key
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/sakhi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: messageText,
        userId: userId || 'anonymous',
        profile: profile || {},
        matches: matches || [],
        applications: applications || [],
        history: getHistory(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Edge function returned ${response.status}`);
    }

    return await response.json();
  };

  const handleSend = async (e, overrideMessage) => {
    if (e) e.preventDefault();
    const messageText = overrideMessage || input.trim();
    if (!messageText) return;

    setMessages(prev => [...prev, { role: 'user', text: messageText }]);
    setInput('');
    setIsTyping(true);
    setSuggestions([]);

    try {
      const data = await sendToSakhi(messageText);

      const reply = data.text || "I'm having trouble right now. Please try again!";
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([
          'Tell me more',
          'Show my scholarships',
          'What documents do I need?'
        ]);
      }
    } catch (err) {
      console.error('[SakhiChat] Error:', err);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: "I'm having a brief connectivity issue. Please try again in a moment! 🙏"
      }]);
      setSuggestions([
        'Try again',
        'Show my scholarships',
        'Check deadlines'
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSend(null, suggestion);
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,113,227,0.4)] z-50 ring-4 ring-white"
          >
            <img src={SAKHI_LOGO} alt="Sakhi" className="w-7 h-7 invert" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 w-80 sm:w-96 h-[520px] bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] ring-1 ring-black/5 flex flex-col overflow-hidden z-50 origin-bottom-right"
          >
            {/* Header */}
            <div className="bg-primary p-4 shrink-0 flex items-center justify-between text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
               <div className="flex items-center gap-3 relative z-10">
                 <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden">
                    <img src={SAKHI_LOGO} alt="Sakhi" className="w-6 h-6 invert" />
                  </div>
                 <div>
                   <h3 className="font-bold tracking-tight">Sakhi AI</h3>
                   <span className="text-xs text-white/70 font-medium flex items-center gap-1">
                     <span className="w-2 h-2 rounded-full bg-green-400"></span> Powered by Groq
                   </span>
                 </div>
               </div>
               <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors relative z-10">
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
               {messages.map((msg, idx) => (
                 <div key={idx} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden ${msg.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-primary/10'}`}>
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <img src={SAKHI_LOGO} alt="Sakhi" className="w-5 h-5" />}
                    </div>
                    <div className={`p-3 rounded-2xl max-w-[75%] text-sm font-medium leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-br-sm' 
                        : 'bg-white border border-gray-100 shadow-sm text-text rounded-bl-sm'
                    }`}>
                      {/* Basic bold + line-break parsing */}
                      {msg.text.split('\n').map((line, li) => (
                        <span key={li}>
                          {li > 0 && <br />}
                          {line.split('**').map((chunk, ci) => ci % 2 !== 0 ? <strong key={ci}>{chunk}</strong> : chunk)}
                        </span>
                      ))}
                    </div>
                 </div>
               ))}
               {isTyping && (
                 <div className="flex items-end gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-primary/10 overflow-hidden">
                      <img src={SAKHI_LOGO} alt="Sakhi" className="w-5 h-5" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm rounded-bl-sm flex gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                 </div>
               )}
               <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {suggestions.length > 0 && !isTyping && (
              <div className="px-3 py-2 bg-white border-t border-gray-50 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold rounded-full whitespace-nowrap transition-colors border border-primary/10"
                  >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
               <input 
                 autoFocus
                 type="text" 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text font-medium"
                 placeholder="Ask Sakhi something..."
                 disabled={isTyping}
               />
               <button type="submit" disabled={!input.trim() || isTyping} className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shrink-0 hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-md">
                 <Send className="w-4 h-4" />
               </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
