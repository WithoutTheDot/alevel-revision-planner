import SubjectBadge from './SubjectBadge';

export default function UpcomingPapers({ upcoming, onComplete }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h2 className="font-semibold text-gray-700 mb-3">Upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="text-sm text-gray-400">All scheduled papers done.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((p) => (
            <div key={p._idx} className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <SubjectBadge subject={p.subject} />
                <div>
                  <p className="text-sm text-gray-800 font-semibold">{p.displayName}</p>
                  <p className="text-xs text-gray-400">{p.scheduledDay} · {p.scheduledStart}</p>
                </div>
              </div>
              <button
                onClick={() => onComplete(p)}
                className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-semibold px-2.5 py-1 rounded-lg"
              >
                Done
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
