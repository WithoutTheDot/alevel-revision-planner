import { xpProgressInLevel } from '../lib/badges';

export default function LevelCard({ xp, level }) {
  const { current, total, pct } = xpProgressInLevel(xp);
  return (
    <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-violet-500 to-purple-600">
      <div className="mb-2 opacity-80">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M10 1a.75.75 0 0 1 .67.415l1.93 3.91 4.31.627a.75.75 0 0 1 .416 1.28l-3.12 3.04.737 4.29a.75.75 0 0 1-1.088.791L10 13.347l-3.855 2.026a.75.75 0 0 1-1.088-.79l.737-4.29L2.674 7.23a.75.75 0 0 1 .416-1.28l4.31-.627 1.93-3.91A.75.75 0 0 1 10 1Z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-2xl font-extrabold leading-none">Lv.{level}</p>
      <p className="text-sm mt-1 font-medium opacity-75">{current} / {total} XP</p>
      <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden">
        <div className="h-1.5 bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
