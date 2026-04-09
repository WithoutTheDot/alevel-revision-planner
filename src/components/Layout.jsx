import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Dialog, DialogPanel } from '@headlessui/react';
import { useAuth } from '../contexts/AuthContext';
import { useNudges } from '../contexts/NudgeContext';
import { useTheme } from '../contexts/ThemeContext';
import Toast from './Toast';
import FullscreenTimer from './FullscreenTimer';

// ─── SVG Icon set (Heroicons outline 20x20) ──────────────────────────────────
const Icons = {
  Dashboard: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
      <rect x="2" y="2" width="7" height="7" rx="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Calendar: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
      <rect x="2" y="4" width="16" height="14" rx="2" />
      <path strokeLinecap="round" d="M6 2v4M14 2v4M2 9h16" />
    </svg>
  ),
  TermSchedule: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
      <rect x="2" y="4" width="16" height="14" rx="2" />
      <path strokeLinecap="round" d="M6 2v4M14 2v4M2 9h16M6 13h2M10 13h2M6 16h2" />
    </svg>
  ),
  Templates: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path strokeLinecap="round" d="M6 8h8M6 11h5" />
    </svg>
  ),
  Generate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  ),
  History: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
      <circle cx="10" cy="10" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6v4l2.5 2.5" />
    </svg>
  ),
  Review: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v0H9v0Z" />
      <path strokeLinecap="round" d="M7 10h6M7 13h4" />
    </svg>
  ),
  Classes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  ),
  Badges: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  ),
  Settings: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] flex-shrink-0">
      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clipRule="evenodd" />
    </svg>
  ),
  Logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
    </svg>
  ),
  Admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-[18px] h-[18px] flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  Menu: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  Close: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
  Sun: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM15.75 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 2 10ZM14.066 14.066a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 1 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.06ZM3.813 3.813a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061L3.813 4.874a.75.75 0 0 1 0-1.061ZM14.066 5.934a.75.75 0 0 1 0-1.06l1.061-1.061a.75.75 0 1 1 1.06 1.06L15.127 5.934a.75.75 0 0 1-1.06 0ZM3.813 16.187a.75.75 0 0 1 0-1.06l1.061-1.061a.75.75 0 1 1 1.06 1.06l-1.061 1.06a.75.75 0 0 1-1.06 0ZM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  ),
  Moon: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M7.455 2.67A6.5 6.5 0 1 0 17.33 12.545a6.5 6.5 0 0 1-9.875-9.875Z" clipRule="evenodd" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',     icon: Icons.Dashboard },
  { to: '/calendar',      label: 'Calendar',      icon: Icons.Calendar },
  { to: '/term-schedule', label: 'Term Schedule',  icon: Icons.TermSchedule },
  { to: '/templates',     label: 'Templates',     icon: Icons.Templates },
  { to: '/generate',      label: 'Generate',      icon: Icons.Generate },
  { to: '/history',       label: 'History',       icon: Icons.History },
  { to: '/review',        label: 'Review',        icon: Icons.Review },
  { to: '/classes',       label: 'Classes',       icon: Icons.Classes },
  { to: '/badges',        label: 'Badges',        icon: Icons.Badges },
  { to: '/settings',      label: 'Settings',      icon: Icons.Settings },
];

const navItemCls = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2 text-sm font-medium border-l-2 transition-colors ${
    isActive
      ? 'border-[var(--color-accent)] text-[var(--color-text-primary)] bg-[var(--color-accent-subtle)]/40'
      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
  }`;

function NavLinks({ onNav, showAdmin }) {
  return (
    <>
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <NavLink key={to} to={to} onClick={onNav} className={navItemCls}>
          {icon}
          {label}
        </NavLink>
      ))}
      {showAdmin && (
        <NavLink to="/admin" onClick={onNav} className={navItemCls}>
          {Icons.Admin}
          Admin
        </NavLink>
      )}
    </>
  );
}

const AppLogo = () => (
  <div className="flex items-center gap-2">
    <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
      </svg>
    </div>
    <span className="text-sm font-semibold text-[var(--color-text-primary)] tracking-tight">A-Level Planner</span>
  </div>
);

export default function Layout() {
  const { logout, profile, currentUser } = useAuth();
  const { nudges, dismiss } = useNudges();
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';
  const [drawerOpen, setDrawerOpen] = useState(false);

  const displayName = profile?.displayName || currentUser?.email?.split('@')[0] || 'You';
  const initials = displayName.slice(0, 2).toUpperCase();

  const userFooter = (onClose) => (
    <div className="px-4 py-3 border-t border-[var(--color-border)] flex items-center gap-3">
      <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)] flex items-center justify-center text-xs font-bold flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{displayName}</p>
          <button
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)] transition-colors flex-shrink-0"
            aria-label="Toggle dark mode"
          >
            {dark ? Icons.Sun : Icons.Moon}
          </button>
        </div>
        <button
          onClick={async () => { try { await logout(); onClose?.(); } catch {} }}
          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] font-medium mt-0.5 transition-colors"
        >
          {Icons.Logout}
          Sign out
        </button>
      </div>
    </div>
  );

  const sidebarContent = (onClose) => (
    <>
      <div className="px-4 py-4 border-b border-[var(--color-border)]">
        <AppLogo />
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        <NavLinks onNav={onClose} showAdmin={false} />
      </nav>
      <div className="px-4 py-2 border-t border-[var(--color-border)]">
        <a
          href="https://github.com/WithoutTheDot/alevel-revision-planner/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors py-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Feedback / report a bug
        </a>
      </div>
      {userFooter(onClose)}
    </>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-bg)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-[var(--color-bg)] border-r border-[var(--color-border)] flex-col flex-shrink-0">
        {sidebarContent(null)}
      </aside>

      {/* Mobile top bar */}
      <div className="flex md:hidden h-13 bg-[var(--color-bg)] border-b border-[var(--color-border)] items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
          aria-label="Open menu"
        >
          {Icons.Menu}
        </button>
        <AppLogo />
      </div>

      {/* Mobile drawer */}
      <Dialog open={drawerOpen} onClose={() => setDrawerOpen(false)} className="relative z-50 md:hidden">
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-y-0 left-0 w-56 bg-[var(--color-bg)] border-r border-[var(--color-border)] flex flex-col shadow-[var(--shadow-md)]">
          <DialogPanel className="flex flex-col h-full">
            <div className="px-4 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <AppLogo />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              >
                {Icons.Close}
              </button>
            </div>
            <nav className="flex-1 py-3 overflow-y-auto">
              <NavLinks onNav={() => setDrawerOpen(false)} showAdmin={false} />
            </nav>
            {userFooter(() => setDrawerOpen(false))}
          </DialogPanel>
        </div>
      </Dialog>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-5 md:p-7 bg-[var(--color-surface)]">
        <Outlet />
      </main>

      {/* Nudge toasts */}
      {nudges.length > 0 && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
          {nudges.map((n) => (
            <Toast
              key={n.id}
              message={`${n.fromDisplayName} nudged you — time to study!`}
              onDismiss={() => dismiss(n.id)}
            />
          ))}
        </div>
      )}

      {/* Fullscreen timer overlay + minimised pill */}
      <FullscreenTimer />
    </div>
  );
}
