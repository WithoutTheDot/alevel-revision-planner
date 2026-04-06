import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useSubjects } from '../contexts/SubjectsContext';

export default function ExamCountdown({ exams }) {
  const { subjectMeta } = useSubjects();

  if (exams.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h2 className="font-semibold text-gray-700 mb-3">Upcoming Exams</h2>
      <div className="space-y-3">
        {exams.map((e) => {
          const days = differenceInCalendarDays(parseISO(e.date), new Date());
          const urgency = days <= 7 ? 'bg-red-50 border-red-200' : days <= 30 ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-100';
          const textColor = days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-indigo-600';
          return (
            <div key={e.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${urgency}`}>
              <div>
                <p className="text-sm font-semibold text-gray-800">{e.paperLabel}</p>
                <p className="text-xs text-gray-500">
                  {subjectMeta[e.subject]?.label || e.subject} · {e.date} at {e.time}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className={`text-xl font-extrabold ${textColor}`}>
                  {days === 0 ? 'Today!' : `${days}d`}
                </p>
                <p className="text-xs text-gray-400">to go</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
