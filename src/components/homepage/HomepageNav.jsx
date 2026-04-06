import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

export default function HomepageNav() {
  const [scrolled, setScrolled] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.nav
      initial={prefersReduced ? false : { y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-brand-border'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-brand-amber flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold tracking-tighter font-display">AP</span>
          </div>
          <span className="font-display font-bold text-lg text-brand-text tracking-tight">
            A-Level Planner
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-8 text-sm font-medium">
          <a href="#features" className="text-brand-muted hover:text-brand-text transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-brand-muted hover:text-brand-text transition-colors">
            How It Works
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold bg-brand-amber text-white hover:bg-brand-amber-dim transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
