import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Target, ShieldCheck, CheckCircle2, ChevronRight, GraduationCap } from 'lucide-react';
import { Button } from '../components/Button';
import { Link } from 'react-router-dom';
import { Hero3D } from '../components/Hero3D';
import { useRef } from 'react';

const LandingPage = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div ref={containerRef} className="flex flex-col min-h-[calc(100vh-64px)] overflow-hidden">
      <main className="flex-1 pb-20">
        <section className="relative px-6 py-24 md:py-32 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
          {/* Subtle background glow */}
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          
          <Hero3D />
          
          <motion.div style={{ y: y1, opacity: opacity1 }} className="relative z-10 flex flex-col items-center w-full pointer-events-none mt-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 border border-primary/20 text-primary text-sm font-bold mb-8 shadow-sm backdrop-blur-xl"
            >
              <Sparkles className="w-4 h-4" /> Next-Gen Scholarship Discovery
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
              className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-center max-w-5xl text-text leading-[1.05]"
            >
              Your Future. <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Perfectly Matched.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className="mt-8 text-xl md:text-2xl text-text/60 text-center max-w-2xl font-medium leading-relaxed"
            >
              Don't search blindly. Tell us who you are, what you're studying, and we'll connect you directly to funding that is actively looking for you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="mt-12 flex flex-col sm:flex-row gap-5 pointer-events-auto"
            >
              <Link to="/onboarding">
                <Button className="flex items-center justify-center gap-2 text-xl px-10 py-5 w-full sm:w-auto shadow-[0_8px_30px_rgb(0,113,227,0.3)] hover:shadow-[0_8px_40px_rgb(0,113,227,0.4)] rounded-full transition-all">
                  Get Started Free <ArrowRight className="w-6 h-6" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Narrative Section: The Problem & The Solution */}
        <section className="py-32 px-6 bg-white border-t border-gray-100 relative">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 md:gap-24">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-1/2"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-gray-50 flex items-center justify-center border border-gray-100 mb-8 shadow-sm">
                 <Target className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">The old way is <br/>broken & exhausting.</h2>
              <p className="text-xl text-text/60 font-medium leading-relaxed mb-8">
                Students spend hundreds of hours browsing through massive scholarship portals, only to find they don't even qualify for the ones they apply to. We flipped the script. 
              </p>
              <ul className="space-y-4">
                {['No more blind searching', 'No more reading endless PDFs', 'No more missed deadines'].map((str, i) => (
                  <li key={i} className="flex items-center gap-3 text-lg font-bold text-text/80">
                     <CheckCircle2 className="w-6 h-6 text-primary" /> {str}
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full md:w-1/2 bg-gray-50 rounded-[3rem] p-10 md:p-14 relative overflow-hidden border border-gray-100"
            >
               <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
               <h3 className="text-3xl font-extrabold mb-8 tracking-tight relative z-10">How ScholarMatch works</h3>
               <div className="space-y-10 relative z-10">
                 {[
                   { step: 1, title: 'Build your profile', desc: 'Tell us your demographic, income, and academics in 30 seconds.' },
                   { step: 2, title: 'Engine analyzes data', desc: 'Our algorithm instantly cross-references 10,000+ opportunities.' },
                   { step: 3, title: 'Get exact matches', desc: 'You are presented only with funding where you meet 100% of the criteria.' }
                 ].map((item, i) => (
                   <div key={i} className="flex gap-6 items-start">
                     <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-bold text-lg text-primary shadow-sm shrink-0 ring-1 ring-black/5">
                       {item.step}
                     </div>
                     <div>
                       <h4 className="text-xl font-bold mb-2 tracking-tight">{item.title}</h4>
                       <p className="text-text/60 font-medium leading-relaxed">{item.desc}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </motion.div>
          </div>
        </section>

        {/* Apple Style Features Grid */}
        <section className="py-32 px-6 bg-background relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-20">
               <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Engineered for speed.</h2>
               <p className="text-xl text-text/60 font-medium leading-relaxed">Everything you need to fund your education, seamlessly integrated into one fluid experience.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Output in < 3s", desc: "Our engine processes thousands of data points instantly. No endless loading.", color: "from-blue-500 to-cyan-500" },
                { icon: ShieldCheck, title: "Zero Data Selling", desc: "Your socioeconomic data is encrypted and never sold to third parties.", color: "from-emerald-400 to-emerald-600" },
                { icon: GraduationCap, title: "Verified Sources", desc: "Every scholarship is manually vetted from government and private trusts.", color: "from-purple-500 to-fuchsia-500" }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: idx * 0.2 }}
                  className="group flex flex-col items-start p-10 rounded-[2.5rem] bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all"
                >
                  <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-8 shadow-inner`}>
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-extrabold mb-4 tracking-tight">{feature.title}</h3>
                  <p className="text-text/60 leading-relaxed font-medium text-lg">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-32 px-6 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-20">
               <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Loved by students.</h2>
               <p className="text-xl text-text/60 font-medium leading-relaxed">Hear from those who found exactly what they were looking for without the hassle.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: "Rahul S.", course: "B.Tech, Maharashtra", quote: "I found a private trust scholarship I didn't even know existed. ScholarMatch made the application process seamless." },
                { name: "Priya M.", course: "B.Sc, Delhi", quote: "The document vault alone is a lifesaver. Plus, the AI Chatbot completely solved my eligibility doubts instantly." },
                { name: "Aman K.", course: "MBA, Karnataka", quote: "Stop scrolling endlessly. This platform just hooks you up with funding you specifically qualify for. 10/10." }
              ].map((testi, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: idx * 0.2 }}
                  className="flex flex-col p-8 rounded-[2rem] bg-gray-50 border border-gray-100 shadow-sm relative"
                >
                  <div className="text-primary text-5xl font-serif absolute top-4 right-6 opacity-20">"</div>
                  <p className="text-text/80 leading-relaxed font-medium text-lg mb-8 italic">"{testi.quote}"</p>
                  <div className="mt-auto flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center font-bold text-gray-500">
                      {testi.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-text">{testi.name}</h4>
                      <p className="text-text/50 text-sm font-medium">{testi.course}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-6 bg-white">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8 }}
             className="max-w-5xl mx-auto bg-black rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden"
           >
             <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent opacity-20"></div>
             <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-8 relative z-10 leading-tight">Ready to fund your <br/>educational journey?</h2>
             <p className="text-white/60 text-xl font-medium mb-12 max-w-2xl mx-auto relative z-10">Join thousands of students who have already matched with over ₹50M in available scholarships.</p>
             <Link to="/onboarding" className="relative z-10 inline-block">
               <button className="bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-3 text-xl px-12 py-5 rounded-full hover:scale-105 transition-transform duration-300 font-bold shadow-xl">
                 Create Free Profile <ChevronRight className="w-6 h-6" />
               </button>
             </Link>
           </motion.div>
        </section>
      </main>
    </div>
  );
};
export default LandingPage;
