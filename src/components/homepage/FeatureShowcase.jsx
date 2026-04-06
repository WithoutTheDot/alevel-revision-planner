import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// ── Icons ──────────────────────────────────────────────────────────────────────
const Ico = ({ children }) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const IconCalendar = () => <Ico><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></Ico>;
const IconDocument = () => <Ico><path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 6.75 4.5H15a2.25 2.25 0 0 1 2.151 1.608m-9.8 0H4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 21h6.75" /></Ico>;
const IconBolt = () => <Ico><path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></Ico>;
const IconFire = () => <Ico><path d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.387 8.214 8.214 0 0 0 3 1.8Z" /><path d="M9.75 11.25A3.75 3.75 0 0 0 12 18a3.75 3.75 0 0 0 3.75-3.75c0-2.033-1.5-4.07-3-5.25-1.5 1.18-3 3.217-3 5.25Z" /></Ico>;
const IconTrophy = () => <Ico><path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" /></Ico>;
const IconChart = () => <Ico><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></Ico>;

const FEATURES = [
  {
    Icon: IconCalendar,
    title: 'Smart Scheduling',
    desc: 'Generates a weekly timetable tailored to your subjects, exam dates, and available study slots — no manual planning.',
  },
  {
    Icon: IconDocument,
    title: 'Past Paper Library',
    desc: '30+ A-Level subjects with organised paper paths spanning AQA, OCR, Edexcel, and more.',
  },
  {
    Icon: IconBolt,
    title: 'XP & Level System',
    desc: 'Earn XP for every paper you complete. Level up your profile and unlock badges as revision progresses.',
  },
  {
    Icon: IconFire,
    title: 'Streak Tracking',
    desc: 'Daily study streaks keep you consistent. Hit 7 days and earn a bonus XP multiplier.',
  },
  {
    Icon: IconTrophy,
    title: 'Class Leaderboards',
    desc: 'Join or create a class, compete with classmates, and stay accountable through exam season.',
  },
  {
    Icon: IconChart,
    title: 'Progress Analytics',
    desc: 'Bar charts and line graphs tracking your improvement over time, broken down by subject and grade band.',
  },
];

function FeatureCard({ Icon, title, desc, delay, prefersReduced }) {
  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 28 }}
      className="bg-white border border-brand-border rounded-[var(--radius-lg)] p-6 hover:border-brand-amber/40 transition-colors cursor-default"
    >
      <div className="w-9 h-9 rounded-[var(--radius-md)] bg-brand-surface border border-brand-border flex items-center justify-center mb-4 text-brand-amber">
        <Icon />
      </div>
      <h3 className="font-display font-semibold text-brand-text text-base mb-2">{title}</h3>
      <p className="text-brand-muted text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

export default function FeatureShowcase() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="features" className="bg-brand-bg py-24 px-6 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold text-brand-text tracking-tight mb-4">
            Everything revision needs
          </h2>
          <p className="text-brand-muted text-lg max-w-xl mx-auto">
            One app. Zero excuses. Built specifically for the A-Level grind.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <FeatureCard
              key={title}
              Icon={Icon}
              title={title}
              desc={desc}
              delay={i * 0.07}
              prefersReduced={prefersReduced}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
