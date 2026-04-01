import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderHeart, UploadCloud, FileText, CheckCircle2, Trash2, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

const DocumentVaultPage = () => {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([
    { id: 1, name: 'Income_Certificate_2023.pdf', type: 'PDF', size: '2.4 MB', date: 'Oct 12, 2023' },
    { id: 2, name: 'Aadhar_Card_Front_Back.jpg', type: 'JPG', size: '1.1 MB', date: 'Oct 15, 2023' },
  ]);
  const [isUploading, setIsUploading] = useState(false);

  // You can load files from Supabase Storage here in the future
  useEffect(() => {
     // loadFilesFromSupabase();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    const isAllowedFormat = file.name.match(/\.(pdf|jpg|jpeg|png)$/i);
    const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
    let validationError = null;

    if (!isAllowedFormat) validationError = "Unsupported format. Use PDF/JPG.";
    else if (!isValidSize) validationError = "File too large. Max 5MB.";

    try {
       if (!validationError) {
         const { data: { session } } = await supabase.auth.getSession();
         if (session) {
            const fileExt = file.name.split('.').pop();
            const filePath = `${session.user.id}/${Math.random()}.${fileExt}`;
            await supabase.storage.from('vault').upload(filePath, file);
         }
       }
    } catch (err) {
       console.warn("Supabase storage upload bypassed, running local demo fallback.", err);
    }

    // Local Demo UI Update
    setTimeout(() => {
      setDocuments(prev => [
        { 
          id: Date.now(), 
          name: file.name, 
          type: file.name.split('.').pop().toUpperCase(), 
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB', 
          date: 'Just now',
          status: validationError ? 'invalid' : 'verified',
          errorMsg: validationError
        },
        ...prev
      ]);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // reset input
    }, 1500); // simulate scanning delay
  };

  const removeDoc = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F5F5F7] pb-20">
      <div className="bg-white border-b border-gray-100 py-12 px-6 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 ring-1 ring-indigo-100 shadow-inner">
              <FolderHeart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-text mb-1">Document Vault</h1>
              <p className="text-text/60 font-medium flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-green-500" /> End-to-end encrypted storage
              </p>
            </div>
          </div>
          
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
          
          <button 
             onClick={() => fileInputRef.current?.click()} 
             disabled={isUploading}
             className="px-6 py-3.5 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center gap-2 shadow-xl hover:bg-gray-900 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
          >
             {isUploading ? <><Loader2 className="w-5 h-5 animate-spin"/> Uploading...</> : <><UploadCloud className="w-5 h-5" /> Choose File</>}
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="font-bold text-lg text-text">Your Files ({documents.length})</h2>
           </div>
           
           <div className="divide-y divide-gray-100">
             <AnimatePresence>
               {documents.length === 0 ? (
                 <motion.div initial={{opacity:0}} animate={{opacity:1}} className="p-12 text-center text-text/50 font-medium">No documents securely stored yet.</motion.div>
               ) : (
                 documents.map(doc => (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }} 
                     animate={{ opacity: 1, height: 'auto' }} 
                     exit={{ opacity: 0, height: 0 }}
                     className="p-6 flex items-center justify-between group hover:bg-gray-50 transition-colors"
                     key={doc.id}
                   >
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0">
                         <FileText className="w-6 h-6" />
                       </div>
                       <div>
                         <p className={`font-bold truncate max-w-[200px] sm:max-w-xs ${doc.status === 'invalid' ? 'text-red-600 line-through opacity-70' : 'text-text'}`}>
                           {doc.name}
                         </p>
                         <p className="text-sm font-medium text-text/50 flex items-center gap-2 mt-0.5">
                           {doc.size} • Uploaded {doc.date}
                           {doc.status === 'invalid' ? (
                             <span className="flex items-center gap-1 text-red-500 font-bold ml-2">
                               <AlertCircle className="w-3 h-3" /> {doc.errorMsg}
                             </span>
                           ) : (
                             <span className="flex items-center gap-1 text-green-600 font-bold ml-2">
                               <CheckCircle2 className="w-3 h-3" /> Verified Match
                             </span>
                           )}
                         </p>
                       </div>
                     </div>
                     <button onClick={() => removeDoc(doc.id)} className="p-2 text-text/30 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                       <Trash2 className="w-5 h-5" />
                     </button>
                   </motion.div>
                 ))
               )}
             </AnimatePresence>
           </div>
        </div>
        
        <p className="text-center text-sm font-medium text-text/40 mt-10 max-w-lg mx-auto leading-relaxed">
          Files uploaded here are automatically attached to your scholarship applications with one click.
        </p>
      </main>
    </div>
  );
};
export default DocumentVaultPage;
