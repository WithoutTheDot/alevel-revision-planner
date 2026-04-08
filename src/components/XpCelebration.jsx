import { useEffect, useState, useRef } from 'react';

const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const StarIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400 inline-block">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

function ConfettiParticle({ delay, left, color }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-sm animate-confetti"
      style={{
        left: `${left}%`,
        top: '-12px',
        backgroundColor: color,
        animationDelay: `${delay}s`,
        animationDuration: `${1.5 + (delay % 0.8)}s`,
      }}
    />
  );
}

export default function XpCelebration({ xpEarned, newBadges, prevLevel, newLevel, isPB, breakdown, onDismiss }) {
  const [displayXp, setDisplayXp] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const duration = 1000;
    function animate(ts) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayXp(Math.round(progress * xpEarned));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [xpEarned]);

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    delay: i * 0.08,
    left: 5 + i * 4.5,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm cursor-pointer flex items-center justify-center"
      onClick={onDismiss}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => <ConfettiParticle key={i} {...p} />)}
      </div>

      {/* Card */}
      <div
        className="relative bg-[var(--color-surface)] rounded-3xl p-8 shadow-2xl text-center max-w-sm w-full mx-4 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl font-extrabold text-indigo-600 mb-3">
          +{displayXp} XP
        </div>

        {breakdown && (
          <div className="mb-3 text-xs text-[var(--color-text-muted)] space-y-0.5">
            <p>Base: +{breakdown.base}</p>
            {breakdown.grade > 0 && <p>Grade bonus: +{breakdown.grade}</p>}
            {breakdown.time > 0 && <p>Speed bonus: +{breakdown.time}</p>}
            {breakdown.badge > 0 && <p>Badge reward: +{breakdown.badge}</p>}
          </div>
        )}

        {prevLevel !== newLevel && (
          <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl px-4 py-2 mb-3 font-bold text-sm">
            Level Up! {prevLevel} → {newLevel}
          </div>
        )}

        {newBadges && newBadges.length > 0 && (
          <div className="mb-3 space-y-1">
            {newBadges.map((b) => (
              <div key={b.id} className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] rounded-lg px-3 py-1.5">
                <span className="text-base">{b.icon || '★'}</span>
                <span>{b.label}</span>
                <span className="text-xs text-amber-500">+{b.xpReward} XP</span>
              </div>
            ))}
          </div>
        )}

        {isPB && (
          <div className="mb-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-600">
            <StarIcon />
            New Personal Best!
          </div>
        )}

        <p className="text-xs text-[var(--color-text-muted)] mt-2">Tap to continue</p>
      </div>
    </div>
  );
}
