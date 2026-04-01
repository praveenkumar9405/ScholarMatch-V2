import { motion } from 'framer-motion';

export const SectionContainer = ({ children, className = '', delay = 0 }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      className={`max-w-7xl mx-auto px-6 py-12 ${className}`}
    >
      {children}
    </motion.section>
  );
};
