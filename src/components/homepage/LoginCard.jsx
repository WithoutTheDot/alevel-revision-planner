import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function LoginCard({ tab, setTab, email, setEmail, password, setPassword, error, loading, onSubmit, dark, setDark }) {
  const prefersReduced = useReducedMotion();
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orb */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-amber/6 rounded-full blur-[120px] pointer-events-none"
        aria-hidden="true"
      />
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(124,58,237) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />

      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-amber flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold tracking-tighter font-display">AP</span>
          </div>
          <span className="font-display font-bold text-xl text-brand-text">A-Level Planner</span>
        </div>

        {/* Card */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
          {/* Headline */}
          <h1 className="font-display font-bold text-2xl text-brand-text mb-1 text-center">
            {tab === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-brand-muted text-sm text-center mb-8">
            {tab === 'login'
              ? 'Sign in to continue your revision'
              : 'Start planning your revision today'}
          </p>

          {/* Tab toggle */}
          <div className="flex p-1 bg-brand-bg rounded-xl border border-brand-border mb-6">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-display font-semibold rounded-lg transition-all capitalize ${
                  tab === t
                    ? 'bg-brand-amber text-white shadow-sm'
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-red-200 text-[var(--color-danger-text)] dark:bg-red-950/60 dark:border-red-800/50 dark:text-red-300 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-display font-medium text-brand-muted mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-amber/60 focus:ring-1 focus:ring-brand-amber/30 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-display font-medium text-brand-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 pr-10 text-sm text-brand-text placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-amber/60 focus:ring-1 focus:ring-brand-amber/30 transition-colors"
                  placeholder={tab === 'login' ? 'Your password' : 'Choose a password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-brand-amber text-white font-display font-bold text-sm rounded-xl hover:bg-brand-amber-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_30px_rgba(124,58,237,0.2)]"
            >
              {loading
                ? 'Please wait…'
                : tab === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between text-xs text-brand-muted">
            <a href="/home" className="hover:text-brand-text transition-colors">
              ← Back to homepage
            </a>
            {setDark && (
              <button
                type="button"
                onClick={() => setDark(!dark)}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-1.5 rounded-lg hover:bg-brand-border/40 transition-colors"
              >
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
