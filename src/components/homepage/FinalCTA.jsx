import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

const ArrowRightIcon = () => (
  <svg className="w-4 h-4 ml-1.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export default function FinalCTA() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="bg-brand-surface border-t border-brand-border py-24 px-6 text-center">
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="max-w-2xl mx-auto"
      >
        <h2 className="text-4xl md:text-6xl font-display font-bold text-brand-text tracking-tight mb-5">
          Start revising<br />
          <span className="text-brand-amber">the right way.</span>
        </h2>
        <p className="text-brand-muted text-lg mb-10">
          Join hundreds of A-Level students who have upgraded their revision routine.
          Free to use, always.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center px-10 py-4 bg-brand-amber text-white font-display font-bold text-lg rounded-[var(--radius-lg)] hover:bg-brand-amber-dim transition-colors"
        >
          Get Started Free <ArrowRightIcon />
        </Link>
        <p className="text-brand-muted/60 text-sm mt-5">No account required to explore · Free forever</p>
      </motion.div>
    </section>
  );
}
