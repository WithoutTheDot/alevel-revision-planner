import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from 'recharts';

const GRADE_COLORS = {
  'A*': '#6366f1', A: '#22c55e', B: '#eab308',
  C: '#f97316', D: '#ef4444', E: '#94a3b8', U: '#64748b',
};

export default function HistoryCharts({ gradeChartData, weekChartData, subjectChartData, studyHoursPerWeekData, topicChartData, subjectMeta, total }) {
  return (
    <div className="space-y-6">
      {/* Grade distribution */}
      {gradeChartData.length > 0 && <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Grade Distribution</h2>
        {gradeChartData.some((d) => d.count > 0) ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gradeChartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {gradeChartData.map((entry) => (
                    <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <details className="mt-2">
              <summary className="text-xs text-gray-400 cursor-pointer">Show data table</summary>
              <table className="mt-2 text-xs w-full border-collapse">
                <thead><tr>{gradeChartData.map((d) => <th key={d.grade} className="border px-2 py-1 text-left">{d.grade}</th>)}</tr></thead>
                <tbody><tr>{gradeChartData.map((d) => <td key={d.grade} className="border px-2 py-1">{d.count}</td>)}</tr></tbody>
              </table>
            </details>
          </>
        ) : (
          <p className="text-gray-400 text-sm">No graded papers yet.</p>
        )}
      </div>}

      {/* Papers per week */}
      {weekChartData.length > 0 && <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-0.5">Papers Completed per Week</h2>
        <p className="text-xs text-gray-400 mb-4">Last 12 weeks</p>
        {weekChartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weekChartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <details className="mt-2">
              <summary className="text-xs text-gray-400 cursor-pointer">Show data table</summary>
              <table className="mt-2 text-xs w-full border-collapse">
                <thead><tr>{weekChartData.map((d) => <th key={d.week} className="border px-2 py-1 text-left">{d.week}</th>)}</tr></thead>
                <tbody><tr>{weekChartData.map((d) => <td key={d.week} className="border px-2 py-1">{d.count}</td>)}</tr></tbody>
              </table>
            </details>
          </>
        ) : null}
      </div>}

      {/* Subject breakdown */}
      {subjectChartData.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Papers by Subject</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectChartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <details className="mt-2">
            <summary className="text-xs text-gray-400 cursor-pointer">Show data table</summary>
            <table className="mt-2 text-xs w-full border-collapse">
              <thead><tr><th className="border px-2 py-1 text-left">Subject</th><th className="border px-2 py-1 text-left">Count</th></tr></thead>
              <tbody>{subjectChartData.map((d) => <tr key={d.name}><td className="border px-2 py-1">{d.name}</td><td className="border px-2 py-1">{d.count}</td></tr>)}</tbody>
            </table>
          </details>
        </div>
      )}

      {/* Study hours per week */}
      {studyHoursPerWeekData && studyHoursPerWeekData.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-0.5">Study Hours per Week</h2>
          <p className="text-xs text-gray-400 mb-4">Last 12 weeks (timed papers only)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={studyHoursPerWeekData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v}h`, 'Hours']} />
              <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <details className="mt-2">
            <summary className="text-xs text-gray-400 cursor-pointer">Show data table</summary>
            <table className="mt-2 text-xs w-full border-collapse">
              <thead><tr>{studyHoursPerWeekData.map((d) => <th key={d.week} className="border px-2 py-1 text-left">{d.week}</th>)}</tr></thead>
              <tbody><tr>{studyHoursPerWeekData.map((d) => <td key={d.week} className="border px-2 py-1">{d.hours}h</td>)}</tr></tbody>
            </table>
          </details>
        </div>
      )}

      {/* Topics to review */}
      {topicChartData && topicChartData.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-0.5">Topics to Review</h2>
          <p className="text-xs text-gray-400 mb-4">Top 10 most-tagged topics after papers</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topicChartData} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
              <XAxis dataKey="topic" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {topicChartData.map((entry) => {
                  const sm = subjectMeta?.[entry.subject];
                  // Derive a fill from the Tailwind color class name (bg-blue-500 → blue-500)
                  const colorName = sm?.color?.replace('bg-', '') ?? 'indigo-500';
                  const FILL_MAP = {
                    'blue-500': '#3b82f6', 'indigo-500': '#6366f1', 'red-500': '#ef4444',
                    'green-500': '#22c55e', 'amber-500': '#f59e0b', 'teal-500': '#14b8a6',
                    'pink-500': '#ec4899', 'violet-500': '#8b5cf6', 'orange-500': '#f97316',
                    'cyan-500': '#06b6d4', 'lime-500': '#84cc16', 'rose-500': '#f43f5e',
                  };
                  return <Cell key={entry.topic} fill={FILL_MAP[colorName] ?? '#6366f1'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <details className="mt-2">
            <summary className="text-xs text-gray-400 cursor-pointer">Show data table</summary>
            <table className="mt-2 text-xs w-full border-collapse">
              <thead><tr><th className="border px-2 py-1 text-left">Topic</th><th className="border px-2 py-1 text-left">Count</th></tr></thead>
              <tbody>{topicChartData.map((d) => <tr key={d.topic}><td className="border px-2 py-1">{d.topic}</td><td className="border px-2 py-1">{d.count}</td></tr>)}</tbody>
            </table>
          </details>
        </div>
      )}

      {total === 0 && gradeChartData.length > 0 && <p className="text-gray-400 text-sm">No data to chart yet.</p>}
    </div>
  );
}
