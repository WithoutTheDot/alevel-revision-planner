import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function HomepageNav() {
  const [scrolled, setScrolled] = useState(false);
  const prefersReduced = useReducedMotion();
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';

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
          ? 'bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-brand-border'
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
          <button
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-[var(--color-surface)] transition-all"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
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
