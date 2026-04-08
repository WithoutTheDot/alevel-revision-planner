import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getIsAdmin } from '../firebase/db';

export default function AdminRoute({ children }) {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState(import.meta.env.VITE_ADMIN_EMAIL ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const isAdmin = await getIsAdmin(cred.user.uid);
      if (!isAdmin) {
        setError('Not authorized as admin');
        return;
      }
      setAuthed(true);
    } catch (e) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">Admin Login</h1>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}
