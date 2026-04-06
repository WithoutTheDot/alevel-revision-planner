import { motion, useReducedMotion } from 'framer-motion';

const STEPS = [
  {
    n: '01',
    title: 'Set up your subjects',
    desc: 'Choose from 30+ A-Level subjects and enter your exam dates. The planner uses this to prioritise the right papers at the right time.',
  },
  {
    n: '02',
    title: 'Generate your schedule',
    desc: 'One click fills your week with the correct past papers based on your template, automatically avoiding recently completed ones.',
  },
  {
    n: '03',
    title: 'Study, complete, level up',
    desc: 'Tick off papers as you finish them, enter your mark and grade, earn XP, and watch your progress charts grow week by week.',
  },
];

export default function HowItWorks() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="how-it-works" className="bg-brand-surface border-y border-brand-border py-24 px-6 scroll-mt-20">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold text-brand-text tracking-tight mb-4">
            Up and running in 3 minutes
          </h2>
          <p className="text-brand-muted text-lg">No complex setup. Just start revising.</p>
        </motion.div>

        <div className="relative">
          {/* Vertical connector */}
          <div
            className="absolute left-[22px] top-8 bottom-8 w-px bg-brand-border hidden sm:block"
            aria-hidden="true"
          />

          <div className="space-y-12">
            {STEPS.map(({ n, title, desc }, i) => (
              <motion.div
                key={n}
                initial={prefersReduced ? false : { opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 260, damping: 28 }}
                className="flex gap-6 items-start"
              >
                {/* Step number */}
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-brand-amber flex items-center justify-center z-10">
                  <span className="text-white text-xs font-display font-bold">{n}</span>
                </div>

                {/* Content */}
                <div className="pt-1.5">
                  <h3 className="font-display font-semibold text-brand-text text-xl mb-2">{title}</h3>
                  <p className="text-brand-muted leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
