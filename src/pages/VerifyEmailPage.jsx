import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyEmailPage() {
  const { currentUser, resendVerification, reloadUser, logout } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  if (!currentUser) return <Navigate to="/home" replace />;
  if (currentUser.emailVerified) return <Navigate to="/dashboard" replace />;

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      await resendVerification();
      setResent(true);
    } catch (e) {
      setError('Failed to resend: ' + e.message);
    } finally {
      setResending(false);
    }
  }

  async function handleCheckVerified() {
    setChecking(true);
    setError('');
    try {
      await reloadUser();
      if (currentUser.emailVerified) {
        navigate('/dashboard');
      } else {
        setError("Email not verified yet — check your inbox and click the link.");
      }
    } catch (e) {
      setError('Something went wrong: ' + e.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 max-w-md w-full shadow-sm text-center">

        <div className="w-14 h-14 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center mx-auto mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-[var(--color-accent)]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Verify your email</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-1">
          We sent a verification link to
        </p>
        <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-6 break-all">
          {currentUser.email}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mb-6">
          Click the link in the email, then come back here and press the button below.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] rounded-[var(--radius-md)] text-sm text-left">
            {error}
          </div>
        )}

        {resent && (
          <div className="mb-4 p-3 bg-[var(--color-success-bg)] text-[var(--color-success-text)] rounded-[var(--radius-md)] text-sm">
            Verification email resent.
          </div>
        )}

        <button
          onClick={handleCheckVerified}
          disabled={checking}
          className="w-full py-2.5 px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold rounded-[var(--radius-md)] text-sm transition-colors disabled:opacity-50 mb-3"
        >
          {checking ? 'Checking…' : "I've verified my email"}
        </button>

        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full py-2.5 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-medium rounded-[var(--radius-md)] text-sm hover:bg-[var(--color-bg)] transition-colors disabled:opacity-50 mb-4"
        >
          {resending ? 'Sending…' : 'Resend verification email'}
        </button>

        <button
          onClick={logout}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
