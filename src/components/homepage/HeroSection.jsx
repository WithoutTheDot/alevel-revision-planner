import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

const SCHEDULE_ROWS = [
  { day: 'Monday',    paper: 'Maths — AQA 2023 Paper 1',      color: 'bg-violet-400' },
  { day: 'Tuesday',   paper: 'Physics — OCR 2022 Paper 3',     color: 'bg-emerald-400' },
  { day: 'Wednesday', paper: 'Chemistry — Edexcel 2023 P2',    color: 'bg-sky-400' },
  { day: 'Thursday',  paper: 'Further Maths — AQA 2022 P1',   color: 'bg-rose-400' },
];

const ArrowRightIcon = () => (
  <svg className="w-4 h-4 ml-1.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } },
};

export default function HeroSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-brand-bg overflow-hidden">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(124,58,237) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-28 pb-20">
        <motion.div
          variants={prefersReduced ? {} : container}
          initial="hidden"
          animate="show"
          className="text-center"
        >
          {/* Eyebrow pill */}
          <motion.span
            variants={prefersReduced ? {} : item}
            className="inline-block px-3 py-1 rounded-[var(--radius-md)] border border-brand-border bg-brand-surface text-brand-muted text-xs font-display font-semibold uppercase tracking-widest mb-8"
          >
            Built for A-Level students
          </motion.span>

          {/* Headline */}
          <motion.h1
            variants={prefersReduced ? {} : item}
            className="text-5xl md:text-7xl font-display font-bold text-brand-text leading-[1.08] tracking-tight mb-6"
          >
            Revise with<br />
            <span className="text-brand-amber">precision.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={prefersReduced ? {} : item}
            className="text-lg md:text-xl text-brand-muted leading-relaxed max-w-2xl mx-auto mb-10"
          >
            The past paper planner that builds your revision schedule, tracks every mark you enter,
            and keeps you motivated through exam season.
          </motion.p>

          {/* CTA */}
          <motion.div variants={prefersReduced ? {} : item} className="flex justify-center mb-20">
            <Link
              to="/login"
              className="inline-flex items-center px-8 py-4 bg-brand-amber text-white font-display font-bold text-base rounded-[var(--radius-lg)] hover:bg-brand-amber-dim transition-colors"
            >
              Get Started Free <ArrowRightIcon />
            </Link>
          </motion.div>

          {/* Floating schedule card */}
          <motion.div
            variants={prefersReduced ? {} : item}
            className="animate-float mx-auto max-w-md relative"
          >
            <div className="bg-white border border-brand-border rounded-[var(--radius-lg)] p-5 text-left shadow-[var(--shadow-md)]">
              {/* Card header */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-brand-muted font-display font-semibold uppercase tracking-widest">
                  This Week
                </p>
                <span className="text-xs text-brand-amber font-display font-semibold">4 papers</span>
              </div>

              {/* Schedule rows */}
              {SCHEDULE_ROWS.map(({ day, paper, color }) => (
                <div key={day} className="flex items-center gap-3 mb-3">
                  <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
                  <span className="text-xs text-brand-muted w-[72px] flex-shrink-0 font-display">{day}</span>
                  <span className="text-sm text-brand-text font-medium truncate">{paper}</span>
                </div>
              ))}

              {/* Progress */}
              <div className="mt-4 pt-4 border-t border-brand-border flex items-center gap-3">
                <span className="text-xs text-brand-amber font-display font-semibold">2/4 done</span>
                <div className="flex-1 h-1 bg-brand-border rounded-full overflow-hidden">
                  <div className="h-1 bg-brand-amber rounded-full" style={{ width: '50%' }} />
                </div>
                <span className="text-xs text-brand-muted font-display">50 XP earned</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
