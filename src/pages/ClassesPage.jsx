import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserClasses, createClass, joinClass, leaveClass } from '../firebase/db';
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

  const displayName = profile?.displayName || currentUser.email.split('@')[0];

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Classes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(true); setError(''); }}
            className="px-4 py-2 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-50"
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

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-1">No classes yet</p>
          <p className="text-sm">Create a class or join one with a 6-character code.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex">
              <div className="w-1.5 bg-gradient-to-b from-indigo-400 to-violet-500 flex-shrink-0" />
              <div className="flex items-start justify-between gap-3 p-5 flex-1">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{cls.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {cls.members?.length ?? 0} member{cls.members?.length !== 1 ? 's' : ''}
                    {cls.subject && (
                      <> · <span className="text-indigo-600 font-medium">{ALL_SUBJECTS.find((s) => s.id === cls.subject)?.label ?? cls.subject}</span></>
                    )}
                  </p>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-gray-400 mr-1">Code:</span>
                    <span className="font-mono text-sm font-bold tracking-widest text-indigo-700">{cls.code}</span>
                    <CopyButton text={cls.code} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Link
                    to={`/classes/${cls.id}`}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100"
                  >
                    Leaderboard
                  </Link>
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
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create a Class</h2>
            {createdCode ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">Class created! Share this code with classmates:</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
                  placeholder="e.g. 6th Form Study Group"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
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
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">Cancel</button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Join a Class</h2>
            {error && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
            <label className="block text-sm font-medium text-gray-700 mb-1">6-Character Code</label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
              placeholder="XXXXXX"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowJoin(false); setJoinCode(''); setError(''); }} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">Cancel</button>
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
