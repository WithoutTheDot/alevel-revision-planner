import { Link } from 'react-router-dom';

export default function HomepageFooter() {
  return (
    <footer className="bg-brand-bg border-t border-brand-border py-14 px-6">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-10 mb-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-brand-amber flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold tracking-tighter font-display">AP</span>
            </div>
            <span className="text-brand-text font-display font-bold">A-Level Planner</span>
          </div>
          <p className="text-brand-muted text-sm leading-relaxed max-w-[200px]">
            The focused revision tool for A-Level students who want results.
          </p>
        </div>

        {/* Quick links */}
        <div>
          <p className="text-brand-text font-display font-semibold text-sm mb-4">Quick Links</p>
          <ul className="space-y-2 text-sm text-brand-muted">
            <li><Link to="/login" className="hover:text-brand-text transition-colors">Dashboard</Link></li>
            <li><Link to="/login" className="hover:text-brand-text transition-colors">History</Link></li>
            <li><Link to="/login" className="hover:text-brand-text transition-colors">Leaderboard</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <p className="text-brand-text font-display font-semibold text-sm mb-4">Legal</p>
          <ul className="space-y-2 text-sm text-brand-muted">
            <li><span className="cursor-default">Privacy Policy</span></li>
            <li><span className="cursor-default">Terms of Service</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-border pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-brand-muted gap-2">
        <span>© 2026 A-Level Study Planner. All rights reserved.</span>
        <span>Built for students, by students.</span>
      </div>
    </footer>
  );
}
