import { motion, useReducedMotion } from 'framer-motion';

const CheckIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0 text-brand-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const BENEFITS = [
  '25 XP for every paper completed',
  '+25 bonus XP for A or A* grades',
  'Streak bonuses at 7 and 30 days',
  'Unlock badges as you hit milestones',
  'Level up your profile as you revise',
  'Compete on class leaderboards',
];

const BADGES = [
  { label: 'Streak', color: 'text-orange-500' },
  { label: 'Scholar', color: 'text-sky-500' },
  { label: 'Champion', color: 'text-amber-500' },
  { label: 'Perfectionist', color: 'text-emerald-500' },
];

export default function XpShowcase() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="bg-brand-bg py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="border border-brand-border rounded-[var(--radius-lg)] bg-brand-surface p-8 md:p-12 grid md:grid-cols-2 gap-12 items-center">
          {/* Left: benefits */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-brand-text tracking-tight mb-3">
              Stay motivated.<br />Every session.
            </h2>
            <p className="text-brand-muted text-base mb-8 leading-relaxed">
              Built-in rewards make consistent revision feel natural, not forced.
            </p>
            <ul className="space-y-3">
              {BENEFITS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-brand-muted text-sm">
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: mock XP card */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 28 }}
          >
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-brand-border p-6 shadow-[var(--shadow-sm)]">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-brand-muted font-display uppercase tracking-widest mb-1">Your Progress</p>
                  <p className="text-4xl font-display font-bold text-brand-text">Lv. 12</p>
                </div>
                <div className="w-9 h-9 rounded-[var(--radius-md)] bg-brand-surface border border-brand-border flex items-center justify-center text-brand-amber">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                  </svg>
                </div>
              </div>

              {/* XP bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-brand-muted font-display mb-2">
                  <span>2,450 XP</span>
                  <span>3,000 XP</span>
                </div>
                <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-1.5 bg-brand-amber rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '82%' }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 1.0, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-2 mb-5 p-3 rounded-[var(--radius-md)] bg-brand-surface border border-brand-border">
                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.387 8.214 8.214 0 0 0 3 1.8Z" />
                  <path d="M9.75 11.25A3.75 3.75 0 0 0 12 18a3.75 3.75 0 0 0 3.75-3.75c0-2.033-1.5-4.07-3-5.25-1.5 1.18-3 3.217-3 5.25Z" />
                </svg>
                <span className="text-sm font-display font-semibold text-brand-text">14-day streak</span>
                <span className="ml-auto text-xs text-brand-muted">+25 XP bonus</span>
              </div>

              {/* Badges */}
              <div>
                <p className="text-xs text-brand-muted font-display uppercase tracking-widest mb-3">Badges earned</p>
                <div className="flex gap-2 flex-wrap">
                  {BADGES.map(({ label, color }) => (
                    <span
                      key={label}
                      className={`px-2.5 py-1 rounded-[var(--radius-sm)] bg-brand-surface border border-brand-border text-xs font-display font-semibold ${color}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
