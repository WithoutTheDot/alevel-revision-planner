import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserClasses, createClass, joinClass, leaveClass, getClassLeaderboard, sendNudge } from '../firebase/db';
import { ALL_SUBJECTS } from '../lib/allSubjects';
import { BADGE_DEFS, BADGE_ICONS, xpToLevel } from '../lib/badges';

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
        copied ? 'border-emerald-300 text-[var(--color-success-text)] bg-[var(--color-success-bg)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
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
        sent
          ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
      } disabled:opacity-50`}
    >
      {sent ? 'Sent' : 'Nudge'}
    </button>
  );
}

export default function ClassesPage() {
  const { currentUser, profile } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('maths');
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState(null);

  // Join modal state
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('classes');

  // Leaderboard state
  const [lbClassId, setLbClassId] = useState(null);
  const [lbEntries, setLbEntries] = useState([]);
  const [lbSubject, setLbSubject] = useState(null);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbError, setLbError] = useState('');
  const [lbSortBy, setLbSortBy] = useState('papers');

  const displayName = profile?.displayName || currentUser.email.split('@')[0];

  const load = useCallback(async () => {
    try {
      const result = await getUserClasses(currentUser.uid);
      setClasses(result);
    } catch (e) {
      setError('Failed to load classes: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.uid]);

  useEffect(() => { load(); }, [load]);

  const loadLeaderboard = useCallback(async (classId) => {
    setLbLoading(true);
    setLbError('');
    try {
      const { entries, subject } = await getClassLeaderboard(classId);
      setLbEntries(entries);
      setLbSubject(subject);
    } catch (e) {
      setLbError('Failed to load leaderboard: ' + e.message);
    } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    const targetId = lbClassId ?? classes[0]?.id;
    if (!targetId) return;
    if (!lbClassId) setLbClassId(targetId);
    loadLeaderboard(targetId);
  }, [activeTab, lbClassId, classes, loadLeaderboard]);

  async function handleCreate() {
    if (!newClassName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const { code } = await createClass(currentUser.uid, displayName, newClassName.trim(), newClassSubject);
      setCreatedCode(code);
      await load();
    } catch (e) {
      setError('Failed to create class: ' + e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (joinCode.trim().length !== 6) return;
    setJoining(true);
    setError('');
    try {
      const classId = await joinClass(currentUser.uid, displayName, joinCode.trim());
      setShowJoin(false);
      setJoinCode('');
      navigate(`/classes/${classId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave(classId) {
    if (!confirm('Leave this class?')) return;
    try {
      await leaveClass(currentUser.uid, classId);
      await load();
    } catch (e) {
      setError('Failed to leave class: ' + e.message);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)]">Classes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(true); setError(''); }}
            className="px-4 py-2 rounded-xl border text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
          >
            Join Class
          </button>
          <button
            onClick={() => { setShowCreate(true); setCreatedCode(null); setNewClassName(''); setNewClassSubject('maths'); setError(''); }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
          >
            Create Class
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-[var(--color-border)]">
        {[
          { id: 'classes', label: 'My Classes' },
          { id: 'leaderboard', label: 'Leaderboard' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] rounded text-sm">{error}</div>}

      {/* My Classes tab */}
      {activeTab === 'classes' && (
        loading ? (
          <p className="text-[var(--color-text-muted)] text-sm">Loading…</p>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-muted)]">
            <p className="text-lg font-medium mb-1">No classes yet</p>
            <p className="text-sm">Create a class or join one with a 6-character code.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex">
                <div className="w-1.5 bg-gradient-to-b from-indigo-400 to-violet-500 flex-shrink-0" />
                <div className="flex items-start justify-between gap-3 p-5 flex-1">
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">{cls.name}</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                      {cls.members?.length ?? 0} member{cls.members?.length !== 1 ? 's' : ''}
                      {cls.subject && (
                        <> · <span className="text-indigo-600 font-medium">{ALL_SUBJECTS.find((s) => s.id === cls.subject)?.label ?? cls.subject}</span></>
                      )}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-[var(--color-text-muted)] mr-1">Code:</span>
                      <span className="font-mono text-sm font-bold tracking-widest text-indigo-700">{cls.code}</span>
                      <CopyButton text={cls.code} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => { setActiveTab('leaderboard'); setLbClassId(cls.id); }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100"
                    >
                      Leaderboard
                    </button>
                    <button
                      onClick={() => handleLeave(cls.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium"
                    >
                      Leave
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && (
        <div>
          {classes.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-muted)]">
              <p className="text-lg font-medium mb-1">No classes yet</p>
              <p className="text-sm">Join or create a class to see its leaderboard.</p>
            </div>
          ) : (
            <>
              {/* Class selector when in multiple classes */}
              {classes.length > 1 && (
                <div className="mb-4 flex items-center gap-2">
                  <label className="text-sm text-[var(--color-text-secondary)]">Class:</label>
                  <select
                    value={lbClassId ?? classes[0]?.id}
                    onChange={(e) => { setLbClassId(e.target.value); loadLeaderboard(e.target.value); }}
                    className="text-sm border border-[var(--color-border)] rounded-lg px-2 py-1 bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort controls */}
              {!lbLoading && lbEntries.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {['papers', 'xp'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setLbSortBy(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        lbSortBy === s
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {s === 'papers' ? 'Papers' : 'XP'}
                    </button>
                  ))}
                  {lbSubject && (
                    <span className="ml-auto text-xs text-[var(--color-text-muted)] self-center">
                      {ALL_SUBJECTS.find((s) => s.id === lbSubject)?.label ?? lbSubject}
                    </span>
                  )}
                </div>
              )}

              {lbError && <div className="mb-3 p-2 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] rounded text-sm">{lbError}</div>}

              {lbLoading ? (
                <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
              ) : (
                <div className="space-y-2">
                  {[...lbEntries]
                    .sort((a, b) =>
                      lbSortBy === 'xp'
                        ? (b.xp ?? 0) - (a.xp ?? 0) || (b.papersCompleted ?? 0) - (a.papersCompleted ?? 0)
                        : (b.papersCompleted ?? 0) - (a.papersCompleted ?? 0)
                    )
                    .map((entry, i) => {
                      const isMe = entry.uid === currentUser.uid;
                      const badgeIds = (entry.badgeIds ?? []).slice(-3);
                      return (
                        <div
                          key={entry.uid}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                            isMe
                              ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent-subtle)]/20'
                              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                          }`}
                        >
                          <span className={`w-6 text-sm font-bold text-center flex-shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-[var(--color-text-muted)]'}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                              {entry.displayName ?? 'Unknown'}{isMe && <span className="text-xs font-normal text-[var(--color-accent)]"> (you)</span>}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {entry.papersCompleted ?? 0} papers · Lv.{xpToLevel(entry.xp ?? 0)} · {entry.xp ?? 0} XP
                            </p>
                            {badgeIds.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {badgeIds.map((bid) => {
                                  const Icon = BADGE_ICONS[bid];
                                  return Icon ? (
                                    <span key={bid} className="text-[var(--color-accent)] w-4 h-4" title={BADGE_DEFS.find((b) => b.id === bid)?.label}>
                                      <Icon className="w-4 h-4" />
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                          {!isMe && (
                            <NudgeButton toUid={entry.uid} fromDisplayName={displayName} />
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Create a Class</h2>
            {createdCode ? (
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">Class created! Share this code with classmates:</p>
                <div className="flex items-center justify-center gap-2 py-4">
                  <span className="font-mono text-3xl font-bold tracking-widest text-indigo-700">{createdCode}</span>
                  <CopyButton text={createdCode} />
                </div>
                <button
                  onClick={() => { setShowCreate(false); setCreatedCode(null); }}
                  className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Class Name</label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
                  placeholder="e.g. 6th Form Study Group"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Subject</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                >
                  {ALL_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-[var(--color-surface)]">Cancel</button>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newClassName.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Join modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Join a Class</h2>
            {error && <div className="mb-3 p-2 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] rounded text-sm">{error}</div>}
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">6-Character Code</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
              placeholder="XXXXXX"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowJoin(false); setJoinCode(''); setError(''); }} className="px-4 py-2 rounded-lg border text-sm hover:bg-[var(--color-surface)]">Cancel</button>
              <button
                onClick={handleJoin}
                disabled={joining || joinCode.length !== 6}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {joining ? 'Joining…' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
