import { useState, useEffect } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { getUserBadges, reconcileBadgesForUser } from '../firebase/db';
import { BADGE_DEFS, BADGE_ICONS, xpToLevel, xpProgressInLevel } from '../lib/badges';
import { format, parseISO } from 'date-fns';

export default function BadgesPage() {
  const { currentUser } = useAuth();
  const [xp, setXp] = useState(0);
  const [earnedMap, setEarnedMap] = useState({}); // badgeId -> { earnedAt }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        // Reconcile first so newly earned badges are present before we render
        await reconcileBadgesForUser(currentUser.uid);
        const [statsSnap, badges] = await Promise.all([
          getDoc(doc(db, 'userPublicStats', currentUser.uid)),
          getUserBadges(currentUser.uid),
        ]);
        if (statsSnap.exists()) setXp(statsSnap.data().xp ?? 0);
        const map = {};
        badges.forEach((b) => { map[b.badgeId] = b; });
        setEarnedMap(map);
      } catch (e) {
        setError('Failed to load: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser.uid]);

  const level = xpToLevel(xp);
  const { current: xpInLevel, total: xpPerLevel, pct } = xpProgressInLevel(xp);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">Badges &amp; XP</h1>

      {error && <div className="mb-4 p-3 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] rounded-[var(--radius-md)] text-sm">{error}</div>}

      {/* Level card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 mb-6">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="font-semibold text-[var(--color-text-primary)]">Level {level}</span>
          <span className="text-[var(--color-text-muted)]">{xpInLevel} / {xpPerLevel} XP</span>
        </div>
        <div className="h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
          <div className="h-1.5 bg-[var(--color-accent)] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">Total XP: {xp.toLocaleString()}</p>
      </div>

      {loading ? (
        <p className="text-[var(--color-text-muted)] text-sm">Loading badges…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BADGE_DEFS.map((badge) => {
            const earned = earnedMap[badge.id];
            const IconComp = BADGE_ICONS[badge.id];
            return (
              <div key={badge.id}
                className={`rounded-[var(--radius-lg)] p-4 border transition-all ${
                  earned
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)] bg-[var(--color-accent-subtle)]/20'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-50'
                }`}>
                <div className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center mb-3 ${
                  earned ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                }`}>
                  {IconComp && <IconComp className="w-4.5 h-4.5" />}
                </div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">{badge.label}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug">{badge.description}</p>
                <p className="text-xs font-medium text-[var(--color-accent)] mt-1.5">+{badge.xpReward} XP</p>
                {earned ? (
                  <p className="text-xs text-[var(--color-success-text)] mt-0.5">{format(parseISO(earned.earnedAt), 'd MMM yyyy')}</p>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Locked</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
