import { Loader2 } from 'lucide-react';

export const Loader = ({ message = "Loading...", fullScreen = true }) => {
  return (
    <div className={`${fullScreen ? 'min-h-[calc(100vh-64px)]' : 'py-12'} flex flex-col items-center justify-center bg-background gap-5 px-6 text-center`}>
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 animate-bounce">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
      {message && (
         <h2 className="text-2xl font-bold tracking-tight text-text animate-pulse">{message}</h2>
      )}
    </div>
  );
};
