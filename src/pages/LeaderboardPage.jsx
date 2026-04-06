import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getClass, getClassLeaderboard, leaveClass, sendNudge, rebuildSubjectStats } from '../firebase/db';
import { BADGE_DEFS, BADGE_ICONS, xpToLevel } from '../lib/badges';
import { ALL_SUBJECTS } from '../lib/allSubjects';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className={`ml-2 text-xs px-2 py-0.5 rounded-lg border transition-colors ${
        copied ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-gray-300 text-gray-500 hover:bg-gray-50'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function NudgeButton({ toUid, fromDisplayName }) {
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  async function handleNudge() {
    if (cooldown) return;
    try {
      await sendNudge(toUid, fromDisplayName);
      setSent(true);
      setCooldown(true);
      setTimeout(() => { setSent(false); setCooldown(false); }, 30000);
    } catch {}
  }

  return (
    <button
      onClick={handleNudge}
      disabled={cooldown}
      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
        sent ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } disabled:opacity-50`}
    >
      {sent ? 'Sent' : 'Nudge'}
    </button>
  );
}

export default function LeaderboardPage() {
  const { classId } = useParams();
  const { currentUser, profile } = useAuth();
  const navigate = useNavigate();

  const [classData, setClassData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardSubject, setLeaderboardSubject] = useState(null);
  const [sortBy, setSortBy] = useState('papers'); // 'papers' | 'xp'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const myDisplayName = profile?.displayName || currentUser?.email?.split('@')[0] || 'Someone';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Repair current user's subject counts from history (background, best-effort)
      rebuildSubjectStats(currentUser.uid).catch(() => {});
      const [cls, boardResult] = await Promise.all([
        getClass(classId),
        getClassLeaderboard(classId),
      ]);
      if (!cls) { setError('Class not found.'); return; }
      setClassData(cls);
      setLeaderboard(boardResult.entries);
      setLeaderboardSubject(boardResult.subject);
    } catch (e) {
      setError('Failed to load: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [classId, currentUser.uid]);

  useEffect(() => { load(); }, [load]);

  const sortedLeaderboard = useMemo(() => {
    if (sortBy === 'xp') {
      return [...leaderboard].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0) || (b.papersCompleted ?? 0) - (a.papersCompleted ?? 0));
    }
    return leaderboard; // already sorted by papers
  }, [leaderboard, sortBy]);

  async function handleLeave() {
    if (!confirm('Leave this class?')) return;
    try {
      await leaveClass(currentUser.uid, classId);
      navigate('/classes');
    } catch (e) {
      setError('Failed to leave: ' + e.message);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <Link to="/classes" className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium">← Classes</Link>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">{classData?.name ?? 'Leaderboard'}</h1>
          {classData && (
            <div className="flex items-center mt-1">
              <span className="text-xs text-[var(--color-text-muted)] mr-1">Code:</span>
              <span className="font-mono text-sm font-bold tracking-widest text-[var(--color-text-primary)]">{classData.code}</span>
              <CopyButton text={classData.code} />
            </div>
          )}
          {leaderboardSubject && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Subject: {ALL_SUBJECTS.find((s) => s.id === leaderboardSubject)?.label ?? leaderboardSubject}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={load} disabled={loading}
            className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] disabled:opacity-50 transition-colors">
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button onClick={handleLeave}
            className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm hover:bg-red-50 transition-colors">
            Leave
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm">{error}</div>}
      {!loading && leaderboard.length === 0 && !error && (
        <p className="text-[var(--color-text-muted)] text-sm">No members found.</p>
      )}

      {leaderboard.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-[var(--color-text-muted)] font-medium">Sort by:</span>
            {['papers', 'xp'].map((s) => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                  sortBy === s
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                }`}>
                {s === 'papers' ? 'Papers' : 'XP'}
              </button>
            ))}
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left">
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide w-12">Rank</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">Streak</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">
                    {leaderboardSubject ? `Papers (${ALL_SUBJECTS.find((s) => s.id === leaderboardSubject)?.label ?? leaderboardSubject})` : 'Papers'}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">XP</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide text-right">Lvl</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {sortedLeaderboard.map((entry, i) => {
                  const isMe = entry.uid === currentUser.uid;
                  const rankColors = ['text-amber-500', 'text-[var(--color-text-muted)]', 'text-amber-700'];
                  const streak = entry.currentStreak ?? 0;
                  const entryXp = entry.xp ?? 0;
                  const entryLevel = entry.level ?? xpToLevel(entryXp);
                  const badgeIds = (entry.badgeIds ?? []).slice(0, 3);
                  return (
                    <tr key={entry.uid}
                      className={`border-b border-[var(--color-border)] last:border-0 ${isMe ? 'bg-[var(--color-accent-subtle)]/40' : 'hover:bg-[var(--color-surface)]'}`}>
                      <td className={`px-4 py-3 font-semibold tabular-nums ${rankColors[i] ?? 'text-[var(--color-text-muted)]'}`}>
                        #{i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                        <span>{entry.displayName}</span>
                        {isMe && <span className="ml-2 text-xs text-[var(--color-text-muted)] font-normal">(you)</span>}
                        {badgeIds.length > 0 && (
                          <span className="ml-2 inline-flex gap-1">
                            {badgeIds.map((bid) => {
                              const IconComp = BADGE_ICONS[bid];
                              return IconComp ? (
                                <span key={bid} className="inline-flex text-[var(--color-accent)] w-4 h-4">
                                  <IconComp className="w-4 h-4" />
                                </span>
                              ) : null;
                            })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">{streak > 0 ? `${streak}d` : '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--color-text-primary)]">{entry.papersCompleted}</td>
                      <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">{entryXp.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)] rounded-[var(--radius-sm)] px-1.5 py-0.5 text-xs font-medium">
                          {entryLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isMe && <NudgeButton toUid={entry.uid} fromDisplayName={myDisplayName} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
