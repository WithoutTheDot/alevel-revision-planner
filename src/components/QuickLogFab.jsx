import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubjects } from '../contexts/SubjectsContext';
import { completePaper } from '../firebase/db';
import CompletionDetailsModal from './CompletionDetailsModal';
import Toast from './Toast';
import { TOAST_DURATION_MS } from '../lib/constants';

export default function QuickLogFab() {
  const { currentUser } = useAuth();
  const { subjectMeta } = useSubjects();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');

  const handleSubmit = useCallback(async (paperData) => {
    if (!currentUser?.uid) {
      setToast('You must be signed in to log a paper.');
      setTimeout(() => setToast(''), TOAST_DURATION_MS);
      return;
    }
    try {
      await completePaper(currentUser.uid, {
        ...paperData,
        source: 'adhoc',
        expectedTime: paperData.durationMins,
      });
      setOpen(false);
      setToast('Paper logged!');
      setTimeout(() => setToast(''), TOAST_DURATION_MS);
    } catch (e) {
      console.error('[QuickLogFab] Failed to log paper:', e);
      setToast('Failed to log paper. Please try again.');
      setTimeout(() => setToast(''), TOAST_DURATION_MS);
    }
  }, [currentUser?.uid]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick log a paper"
        className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center text-2xl font-light"
      >
        +
      </button>
      {open && (
        <CompletionDetailsModal
          mode="adhoc"
          paper={{ subject: Object.keys(subjectMeta)?.[0] ?? '', displayName: '', marks: null, grade: null, comment: null }}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
          submitLabel="Log Paper"
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
    </>
  );
}
