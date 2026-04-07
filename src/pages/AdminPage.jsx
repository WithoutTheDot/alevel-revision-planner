import { useState, useCallback, useEffect } from 'react';
import {
  getAllPublicStats, getAllClasses,
  adminGetUserCompletions, adminOverrideUserStats,
  adminAddUserToClass, adminRemoveUserFromClass, adminRegenerateClassCode,
  deleteAllUserData,
} from '../firebase/db';
import { formatTime } from '../lib/timeUtils';

const TABS = ['Overview', 'Users', 'Classes', 'Membership', 'Override'];

// ─── Shared ───────────────────────────────────────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-3xl font-extrabold text-indigo-600">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// ─── User Detail Modal ────────────────────────────────────────────────────────

function UserDetailModal({ user, onClose, onDeleted }) {
  const [completions, setCompletions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDeleteUserData() {
    setDeleteLoading(true);
    try {
      await deleteAllUserData(user.uid);
      onDeleted(user.uid);
      onClose();
    } catch (e) {
      setError('Failed to delete: ' + e.message);
      setDeleteLoading(false);
    }
  }

  async function loadCompletions() {
    setLoading(true);
    try {
      const c = await adminGetUserCompletions(user.uid, 10);
      setCompletions(c);
    } catch (e) {
      setError('Failed to load: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-800">{user.displayName || user.uid.slice(0, 8)}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 overflow-auto flex-1 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-lg font-bold text-indigo-600">{user.papersCompleted ?? 0}</p>
              <p className="text-xs text-gray-500">Papers</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-lg font-bold text-indigo-600">{user.xp ?? 0}</p>
              <p className="text-xs text-gray-500">XP</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-lg font-bold text-indigo-600">{((user.studyMinutes ?? 0) / 60).toFixed(1)}h</p>
              <p className="text-xs text-gray-500">Study</p>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {!completions && (
            <button
              onClick={loadCompletions}
              disabled={loading}
              className="w-full py-2 border rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load recent completions'}
            </button>
          )}

          {completions && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Last 10 completions</h3>
              {completions.length === 0 ? (
                <p className="text-sm text-gray-400">None yet</p>
              ) : (
                <ul className="divide-y text-sm">
                  {completions.map((c) => (
                    <li key={c.id} className="py-2 flex items-center justify-between">
                      <span className="text-gray-800 truncate max-w-[200px]">{c.displayName}</span>
                      <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                        {c.grade && <span className="font-semibold text-indigo-600">{c.grade}</span>}
                        {c.actualDurationSeconds != null && <span className="font-mono">{formatTime(c.actualDurationSeconds)}</span>}
                        <span>{c.completedAt ? new Date(c.completedAt).toLocaleDateString() : '—'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="border-t border-red-100 pt-4 mt-2">
            <p className="text-xs font-semibold text-red-600 uppercase mb-1">Danger zone</p>
            <p className="text-xs text-gray-500 mb-3">
              Deletes all Firestore data for this user. Their login account remains but the app will be unusable.
            </p>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 border border-red-300 hover:bg-red-50 transition-colors"
              >
                Delete user data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-700 font-medium">Are you sure?</span>
                <button
                  onClick={handleDeleteUserData}
                  disabled={deleteLoading}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleteLoading ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Class Detail Modal ───────────────────────────────────────────────────────

function ClassDetailModal({ cls, allUsers, onClose, onUpdate }) {
  const [addUid, setAddUid] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState(cls.code);

  const memberStats = (cls.members ?? []).map((uid) => allUsers.find((u) => u.uid === uid) || { uid, displayName: uid.slice(0, 8) });

  async function handleRemove(uid) {
    setSaving(true);
    try {
      await adminRemoveUserFromClass(cls.id, uid);
      onUpdate();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!addUid.trim()) return;
    setSaving(true);
    try {
      await adminAddUserToClass(cls.id, addUid.trim());
      onUpdate();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenCode() {
    setSaving(true);
    try {
      const newCode = await adminRegenerateClassCode(cls.id);
      setCode(newCode);
      onUpdate();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">{cls.name}</h2>
            <p className="text-xs text-gray-500 font-mono">Code: {code}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRegenCode}
              disabled={saving}
              className="text-xs border px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
            >
              Regen Code
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
        </div>
        <div className="p-5 overflow-auto flex-1 space-y-4">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Members ({memberStats.length})</h3>
            <ul className="divide-y text-sm">
              {memberStats.map((m) => (
                <li key={m.uid} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-gray-800">{m.displayName || m.uid.slice(0, 8)}</span>
                    <span className="ml-2 text-xs text-gray-400">{m.papersCompleted ?? 0} papers</span>
                  </div>
                  <button
                    onClick={() => handleRemove(m.uid)}
                    disabled={saving}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="User UID to add"
              value={addUid}
              onChange={(e) => setAddUid(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ stats, classes }) {
  const totalUsers = stats.length;
  const totalPapers = stats.reduce((s, u) => s + (u.papersCompleted ?? 0), 0);
  const totalXp = stats.reduce((s, u) => s + (u.xp ?? 0), 0);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Users" value={totalUsers} />
      <StatCard label="Papers Completed" value={totalPapers} />
      <StatCard label="Total Classes" value={classes.length} />
      <StatCard label="Total XP Awarded" value={totalXp.toLocaleString()} />
    </div>
  );
}

// ─── Tab: Users ───────────────────────────────────────────────────────────────

function UsersTab({ stats }) {
  const [search, setSearch] = useState('');
  const [viewUser, setViewUser] = useState(null);
  const [deletedUids, setDeletedUids] = useState(new Set());
  const filtered = stats.filter((u) =>
    !deletedUids.has(u.uid) &&
    (!search || (u.displayName || '').toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xs border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b bg-gray-50">
                <th className="px-5 py-2 text-left font-medium">Name</th>
                <th className="px-5 py-2 text-right font-medium">Papers</th>
                <th className="px-5 py-2 text-right font-medium">XP</th>
                <th className="px-5 py-2 text-right font-medium">Level</th>
                <th className="px-5 py-2 text-right font-medium">Study h</th>
                <th className="px-5 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => (
                <tr key={u.uid}>
                  <td className="px-5 py-2.5 text-gray-800">{u.displayName || u.uid.slice(0, 8)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{u.papersCompleted ?? 0}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{u.xp ?? 0}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{u.level ?? 1}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{((u.studyMinutes ?? 0) / 60).toFixed(1)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => setViewUser(u)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {viewUser && (
        <UserDetailModal
          user={viewUser}
          onClose={() => setViewUser(null)}
          onDeleted={(uid) => { setDeletedUids((prev) => new Set([...prev, uid])); }}
        />
      )}
    </div>
  );
}

// ─── Tab: Classes ─────────────────────────────────────────────────────────────

function ClassesTab({ classes, allUsers, onUpdate }) {
  const [viewClass, setViewClass] = useState(null);
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b bg-gray-50">
                <th className="px-5 py-2 text-left font-medium">Name</th>
                <th className="px-5 py-2 text-left font-medium">Code</th>
                <th className="px-5 py-2 text-left font-medium">Subject</th>
                <th className="px-5 py-2 text-right font-medium">Members</th>
                <th className="px-5 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {classes.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-2.5 text-gray-800">{c.name}</td>
                  <td className="px-5 py-2.5 font-mono text-gray-600">{c.code}</td>
                  <td className="px-5 py-2.5 text-gray-600">{c.subject || '—'}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{(c.members ?? []).length}</td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => setViewClass(c)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {viewClass && (
        <ClassDetailModal
          cls={viewClass}
          allUsers={allUsers}
          onClose={() => setViewClass(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

// ─── Tab: Membership ─────────────────────────────────────────────────────────

function MembershipTab({ classes, allUsers, onUpdate }) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cls = classes.find((c) => c.id === selectedClassId);
  const memberUids = new Set(cls?.members ?? []);
  const members = allUsers.filter((u) => memberUids.has(u.uid));
  const nonMembers = allUsers.filter((u) => !memberUids.has(u.uid));

  async function toggle(uid, isMember) {
    if (!cls) return;
    setSaving(true);
    setError('');
    try {
      if (isMember) {
        await adminRemoveUserFromClass(cls.id, uid);
      } else {
        await adminAddUserToClass(cls.id, uid);
      }
      onUpdate();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <select
        value={selectedClassId}
        onChange={(e) => setSelectedClassId(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        <option value="">Select a class…</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {cls && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Members ({members.length})</h3>
            <ul className="space-y-1">
              {members.map((u) => (
                <li key={u.uid} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-800">{u.displayName || u.uid.slice(0, 8)}</span>
                  <button
                    onClick={() => toggle(u.uid, true)}
                    disabled={saving}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Non-members ({nonMembers.length})</h3>
            <ul className="space-y-1">
              {nonMembers.map((u) => (
                <li key={u.uid} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-800">{u.displayName || u.uid.slice(0, 8)}</span>
                  <button
                    onClick={() => toggle(u.uid, false)}
                    disabled={saving}
                    className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Override ────────────────────────────────────────────────────────────

function OverrideTab({ stats }) {
  const [selectedUid, setSelectedUid] = useState('');
  const [xp, setXp] = useState('');
  const [studyMinutes, setStudyMinutes] = useState('');
  const [papersCompleted, setPapersCompleted] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const selectedUser = stats.find((u) => u.uid === selectedUid);

  function handleSelectUser(uid) {
    setSelectedUid(uid);
    const u = stats.find((s) => s.uid === uid);
    if (u) {
      setXp(String(u.xp ?? 0));
      setStudyMinutes(String(u.studyMinutes ?? 0));
      setPapersCompleted(String(u.papersCompleted ?? 0));
    }
    setSuccess('');
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedUid) return;
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await adminOverrideUserStats(selectedUid, {
        xp: xp !== '' ? Number(xp) : undefined,
        studyMinutes: studyMinutes !== '' ? Number(studyMinutes) : undefined,
        papersCompleted: papersCompleted !== '' ? Number(papersCompleted) : undefined,
      });
      setSuccess('Stats updated successfully.');
    } catch (e) {
      setError('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <select
        value={selectedUid}
        onChange={(e) => handleSelectUser(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        <option value="">Select a user…</option>
        {stats.map((u) => (
          <option key={u.uid} value={u.uid}>{u.displayName || u.uid.slice(0, 8)}</option>
        ))}
      </select>

      {selectedUser && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            Warning: This directly overwrites the user's stats. Values are SET, not incremented.
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-emerald-600 font-medium">{success}</p>}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">XP</label>
              <input
                type="number" min="0" value={xp}
                onChange={(e) => setXp(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Study Minutes</label>
              <input
                type="number" min="0" value={studyMinutes}
                onChange={(e) => setStudyMinutes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Papers Completed</label>
              <input
                type="number" min="0" value={papersCompleted}
                onChange={(e) => setPapersCompleted(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Apply Override'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ─── Main AdminPage ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([getAllPublicStats(), getAllClasses()]);
      setStats(s.sort((a, b) => (b.papersCompleted ?? 0) - (a.papersCompleted ?? 0)));
      setClasses(c);
    } catch (e) {
      setError('Failed to load: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform overview</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <>
            {activeTab === 'Overview' && <OverviewTab stats={stats} classes={classes} />}
            {activeTab === 'Users' && <UsersTab stats={stats} />}
            {activeTab === 'Classes' && <ClassesTab classes={classes} allUsers={stats} onUpdate={loadAll} />}
            {activeTab === 'Membership' && <MembershipTab classes={classes} allUsers={stats} onUpdate={loadAll} />}
            {activeTab === 'Override' && <OverrideTab stats={stats} />}
          </>
        )}
      </div>
    </div>
  );
}
