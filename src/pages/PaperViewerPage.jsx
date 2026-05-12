import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTimerContext } from '../contexts/TimerContext';
import FullscreenTimer from '../components/FullscreenTimer';
import StartTimerModal from '../components/StartTimerModal';

export default function PaperViewerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, startSession } = useTimerContext();
  const [showModal, setShowModal] = useState(false);
  const [confirmMs, setConfirmMs] = useState(false);
  const [showMs, setShowMs] = useState(false);

  const { pdfUrl, label, paper, msUrl } = location.state ?? {};

  async function handleTimerStart(expectedMins) {
    await startSession({ ...paper, source: 'viewer' }, expectedMins);
    setShowModal(false);
  }

  function handleConfirmMs() {
    setConfirmMs(false);
    setShowMs(true);
  }

  if (!pdfUrl) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-950 text-white gap-4">
        <p className="text-gray-400">No PDF to display.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-700"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-white/10 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L4.863 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">
            {paper?.displayName ?? 'Paper'}
          </span>
          {label && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-white/10 text-white/70 flex-shrink-0">
              {label}
            </span>
          )}
          {showMs && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 flex-shrink-0">
              + MS
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!session && paper && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v4.59L7.3 9.24a.75.75 0 0 0-1.1 1.02l3.25 3.5a.75.75 0 0 0 1.1 0l3.25-3.5a.75.75 0 1 0-1.1-1.02l-1.95 2.1V6.75Z" clipRule="evenodd" />
              </svg>
              Start Timer
            </button>
          )}
          {msUrl && !showMs && (
            <button
              onClick={() => setConfirmMs(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 rounded-lg text-white transition-colors"
            >
              Mark Scheme
            </button>
          )}
          {showMs && (
            <button
              onClick={() => setShowMs(false)}
              className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg text-white/70 transition-colors"
            >
              Hide MS
            </button>
          )}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Open in tab
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 10L10 2M10 2H5.5M10 2v4.5" />
            </svg>
          </a>
        </div>
      </div>

      {/* PDF pane(s) */}
      <div className="flex flex-1 min-h-0">
        {/* Question paper */}
        <div className={`flex flex-col min-w-0 ${showMs ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>
          {showMs && (
            <div className="px-3 py-1.5 bg-gray-800 text-xs font-semibold text-white/50 uppercase tracking-wider flex-shrink-0">
              Question Paper
            </div>
          )}
          <iframe
            src={pdfUrl}
            className="flex-1 w-full border-0 bg-white"
            title={`${paper?.displayName ?? 'Paper'} — ${label ?? 'QP'}`}
          />
        </div>

        {/* Mark scheme (split) */}
        {showMs && (
          <div className="flex flex-col w-1/2 min-w-0">
            <div className="px-3 py-1.5 bg-amber-900/40 text-xs font-semibold text-amber-400 uppercase tracking-wider flex-shrink-0">
              Mark Scheme
            </div>
            <iframe
              src={msUrl}
              className="flex-1 w-full border-0 bg-white"
              title={`${paper?.displayName ?? 'Paper'} — MS`}
            />
          </div>
        )}
      </div>

      <FullscreenTimer />

      {showModal && paper && (
        <StartTimerModal
          paper={paper}
          onStart={handleTimerStart}
          onClose={() => setShowModal(false)}
        />
      )}

      {confirmMs && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-bg)] rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full border border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">Open mark scheme?</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Are you really stuck?</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-5">
              Try the question a bit longer before checking — you'll learn more that way.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmMs(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Keep trying
              </button>
              <button
                onClick={handleConfirmMs}
                className="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                Yes, open it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
