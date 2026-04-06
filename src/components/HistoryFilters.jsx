const selectCls = 'border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

export default function HistoryFilters({ search, onSearch, filterSubject, onFilterSubject, filterGrade, onFilterGrade, subjects, grades }) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        type="text"
        placeholder="Search papers…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <select value={filterSubject} onChange={(e) => onFilterSubject(e.target.value)} className={selectCls}>
        <option value="all">All subjects</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <select value={filterGrade} onChange={(e) => onFilterGrade(e.target.value)} className={selectCls}>
        <option value="all">All grades</option>
        {grades.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
    </div>
  );
}
