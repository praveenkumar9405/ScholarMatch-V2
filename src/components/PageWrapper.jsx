import { motion } from 'framer-motion';

export const PageWrapper = ({ children, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`min-h-[calc(100vh-64px)] bg-background ${className}`}
    >
      {children}
    </motion.div>
  );
};
