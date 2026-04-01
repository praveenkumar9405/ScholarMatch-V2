import { motion } from 'framer-motion';
import { Calendar, IndianRupee, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ScholarshipCard = ({ id, name, amount, deadline, score, index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-hover hover:-translate-y-1 transition-all group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-4 gap-4">
        <h3 className="text-xl font-bold text-text leading-tight">{name}</h3>
        {score && (
          <div className="flex-shrink-0 flex items-center justify-center bg-success/10 text-success px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-success/20 whitespace-nowrap">
            {Math.round(score)}% Match
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 mb-8">
        <div className="flex items-center text-sm text-text/80 gap-2 font-medium">
          <IndianRupee className="w-5 h-5 text-primary bg-primary/10 p-1 rounded-full" />
          <span>{amount ? `₹${Number(amount).toLocaleString()}` : 'Variable Amount'}</span>
        </div>
        <div className="flex items-center text-sm text-text/80 gap-2 font-medium">
          <Calendar className="w-5 h-5 text-gray-400 bg-gray-100 p-1 rounded-full" />
          <span>{deadline ? new Date(deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Ongoing'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-5 border-t border-gray-50">
        <Link to={`/scholarship/${id}`} className="text-primary font-semibold text-sm hover:text-black flex items-center gap-1 group-hover:gap-2 transition-all">
          View Detailed <ArrowRight className="w-4 h-4" />
        </Link>
        <button className="bg-text text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary transition-colors shadow-sm">
          Apply Now
        </button>
      </div>
    </motion.div>
  );
};
