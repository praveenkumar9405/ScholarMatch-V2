import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User as UserIcon } from 'lucide-react';
import { supabase } from '../services/supabase';
export const SakhiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I am Sakhi, your AI scholarship assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    const currentInput = input.toLowerCase();
    setInput('');
    setIsTyping(true);

    try {
      // Perform Real DB Query to use as RAG context
      const { data, error } = await supabase.from('scholarships').select('*');
      let schols = [];
      if (!error && data) {
         schols = data;
      } else {
         const { DUMMY_SCHOLARSHIPS } = await import('../data/scholarships.js');
         schols = DUMMY_SCHOLARSHIPS;
      }

      // Convert Database schemas to raw text string context
      const contextData = schols.map(s => 
        `- **${s.name}**: For ${s.course} students in ${s.state === 'all' ? 'All India' : s.state}. Amount: ₹${s.amount || 'Variable'}. Rules: ${s.eligibility_text || 'See official docs'}.`
      ).join('\n');

      const systemPrompt = `You are Sakhi AI, a highly empathetic and highly concise scholarship assistant for Indian students. 
You exist inside the 'ScholarMatch' SaaS dashboard.
Use the following ACTIVE DATABANK of scholarships to answer the user's questions truthfully. 
If a scholarship isn't in your context, tell them you can't find it. 
Keep your replies under 3 sentences and use **markdown bolding** for emphasis. Do NOT use headers.

ACTIVE DATABANK:
${contextData}`;

      // Format previous chat history for OpenAI
      const openAiHistory = messages.map(m => ({
         role: m.role === 'bot' ? 'assistant' : 'user',
         content: m.text
      }));

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) throw new Error("Missing OpenAI API Key");

      // Invoke OpenAI Chat Completions API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
         },
         body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            messages: [
               { role: 'system', content: systemPrompt },
               ...openAiHistory,
               { role: 'user', content: currentInput } // Latest user message
            ]
         })
      });

      const resData = await response.json();
      
      let reply = "I'm having trouble processing that right now. Could you rephrase?";
      if (resData.choices && resData.choices[0] && resData.choices[0].message) {
         reply = resData.choices[0].message.content;
      }

      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
      setIsTyping(false);

    } catch (err) {
       console.error("Sakhi AI Error:", err);
       setMessages(prev => [...prev, { role: 'bot', text: "I'm currently overloaded with requests and experiencing network trouble. Please double-check the API keys and try again!" }]);
       setIsTyping(false);
    }
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
            <MessageCircle className="w-6 h-6" />
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
            className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] ring-1 ring-black/5 flex flex-col overflow-hidden z-50 origin-bottom-right"
          >
            {/* Header */}
            <div className="bg-primary p-4 shrink-0 flex items-center justify-between text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
               <div className="flex items-center gap-3 relative z-10">
                 <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                   <Bot className="w-6 h-6 shrink-0" />
                 </div>
                 <div>
                   <h3 className="font-bold tracking-tight">Sakhi AI</h3>
                   <span className="text-xs text-white/70 font-medium flex items-center gap-1">
                     <span className="w-2 h-2 rounded-full bg-green-400"></span> Online
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-primary/10 text-primary'}`}>
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={`p-3 rounded-2xl max-w-[75%] text-sm font-medium leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-br-sm' 
                        : 'bg-white border border-gray-100 shadow-sm text-text rounded-bl-sm'
                    }`}>
                      {/* Very basic bold parsing */}
                      {msg.text.split('**').map((chunk, i) => i % 2 !== 0 ? <strong key={i}>{chunk}</strong> : chunk)}
                    </div>
                 </div>
               ))}
               {isTyping && (
                 <div className="flex items-end gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-primary/10 text-primary">
                      <Bot className="w-5 h-5" />
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

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
               <input 
                 autoFocus
                 type="text" 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text font-medium"
                 placeholder="Ask Sakhi something..."
               />
               <button type="submit" disabled={!input.trim()} className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shrink-0 hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-md">
                 <Send className="w-4 h-4" />
               </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
