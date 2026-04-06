import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const STATS = [
  { value: 500,  suffix: '+', label: 'students revising' },
  { value: 30,   suffix: '+', label: 'A-Level subjects' },
  { value: 2400, suffix: '+', label: 'past papers catalogued' },
];

function CountUp({ target, suffix, inView, prefersReduced }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView || prefersReduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(target);
      return;
    }
    const duration = 1200;
    const steps = 40;
    const stepValue = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += stepValue;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [inView, target, prefersReduced]);

  return (
    <span>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export default function StatsBar() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-brand-surface border-y border-brand-border py-12 px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 divide-x divide-brand-border">
        {STATS.map(({ value, suffix, label }, i) => (
          <motion.div
            key={label}
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.12, type: 'spring', stiffness: 280, damping: 30 }}
            className="text-center px-4"
          >
            <p className="text-3xl md:text-4xl font-display font-bold text-brand-amber leading-none mb-1">
              <CountUp target={value} suffix={suffix} inView={inView} prefersReduced={prefersReduced} />
            </p>
            <p className="text-sm text-brand-muted">{label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
