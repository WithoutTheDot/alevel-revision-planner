import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getActiveSession,
  startActiveSession,
  pauseActiveSession,
  resumeActiveSession,
  clearActiveSession,
} from '../firebase/db';

const noop = async () => {};
const defaultCtx = {
  session: null,
  isFullscreen: false,
  startSession: noop,
  pauseSession: noop,
  resumeSession: noop,
  stopSession: noop,
  setFullscreen: () => {},
  getTimerData: () => null,
  getElapsed: () => null,
  startTimer: () => {},
  stopTimer: () => {},
};

const TimerContext = createContext(defaultCtx);

export function useTimerContext() {
  return useContext(TimerContext);
}

export function TimerProvider({ children }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;

  // session shape: { paperPath, subject, displayName, weekId, paperIndex, source,
  //   expectedMins, elapsedSeconds (computed live), isRunning, isPaused }
  const [session, setSession] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for tick computation
  const intervalRef = useRef(null);
  const baseElapsedRef = useRef(0);   // accumulated seconds before current run started
  const startedAtRef = useRef(null);  // Date.now() when the current run began
  const sessionRef = useRef(null);    // mirror of session state (for event handlers)

  useEffect(() => { sessionRef.current = session; }, [session]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(() => {
      if (startedAtRef.current == null) return;
      const elapsed = baseElapsedRef.current + (Date.now() - startedAtRef.current) / 1000;
      setSession((prev) => prev ? { ...prev, elapsedSeconds: elapsed } : null);
    }, 1000);
  }, [stopInterval]);

  // Load persisted session from Firestore on mount / uid change
  useEffect(() => {
    if (!uid) return;
    getActiveSession(uid).then((fs) => {
      if (!fs) return;
      if (fs.isRunning && fs.startedAt) {
        const startedAtMs = fs.startedAt.toMillis
          ? fs.startedAt.toMillis()
          : (typeof fs.startedAt === 'number' ? fs.startedAt * 1000 : Date.now());
        const accumulated = fs.elapsedSeconds ?? 0;
        const additionalElapsed = (Date.now() - startedAtMs) / 1000;
        baseElapsedRef.current = accumulated + additionalElapsed;
        startedAtRef.current = Date.now();
        setSession({ ...fs, elapsedSeconds: baseElapsedRef.current });
        startInterval();
      } else if (fs.isPaused) {
        baseElapsedRef.current = fs.elapsedSeconds ?? 0;
        setSession({ ...fs, elapsedSeconds: fs.elapsedSeconds ?? 0 });
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Cleanup on unmount
  useEffect(() => () => stopInterval(), [stopInterval]);

  async function startSession(paperData, expectedMins) {
    // Stop any existing session first
    stopInterval();
    if (uid) {
      await clearActiveSession(uid).catch(() => {});
    }
    const sessionData = {
      paperPath: paperData.paperPath ?? null,
      subject: paperData.subject ?? null,
      displayName: paperData.displayName ?? '',
      weekId: paperData.weekId ?? null,
      paperIndex: paperData._idx != null ? paperData._idx : (paperData.paperIndex ?? null),
      source: paperData.source ?? 'scheduled',
      expectedMins,
    };
    if (uid) {
      await startActiveSession(uid, sessionData).catch(() => {});
    }
    baseElapsedRef.current = 0;
    startedAtRef.current = Date.now();
    setSession({ ...sessionData, elapsedSeconds: 0, isRunning: true, isPaused: false });
    startInterval();
    setIsFullscreen(true);
  }

  async function pauseSession() {
    const sess = sessionRef.current;
    if (!sess?.isRunning) return;
    const elapsed = baseElapsedRef.current + (Date.now() - startedAtRef.current) / 1000;
    stopInterval();
    baseElapsedRef.current = elapsed;
    setSession((prev) => prev ? { ...prev, elapsedSeconds: elapsed, isRunning: false, isPaused: true } : null);
    if (uid) await pauseActiveSession(uid, elapsed).catch(() => {});
  }

  async function resumeSession() {
    const sess = sessionRef.current;
    if (!sess?.isPaused) return;
    startedAtRef.current = Date.now();
    if (uid) await resumeActiveSession(uid, baseElapsedRef.current).catch(() => {});
    setSession((prev) => prev ? { ...prev, isRunning: true, isPaused: false } : null);
    startInterval();
  }

  async function stopSession() {
    stopInterval();
    baseElapsedRef.current = 0;
    startedAtRef.current = null;
    setSession(null);
    setIsFullscreen(false);
    if (uid) await clearActiveSession(uid).catch(() => {});
  }

  // ─── Backward-compat API (mirrors old useTimer hook) ─────────────────────
  // Keys are in format: timer_${weekId}_${paperIndex}

  function _matchesKey(key) {
    if (!session) return false;
    const parts = key.split('_');
    if (parts.length < 3) return false;
    const wId = parts[1];
    const pIdx = parseInt(parts[2]);
    return session.weekId === wId && session.paperIndex === pIdx;
  }

  function getTimerData(key) {
    if (!_matchesKey(key)) return null;
    // Synthetic startedAt so old code computing (Date.now() - startedAt) / 1000 gets correct elapsed
    return {
      startedAt: Date.now() - (session.elapsedSeconds ?? 0) * 1000,
      expectedMins: session.expectedMins,
    };
  }

  function getElapsed(key) {
    if (!_matchesKey(key)) return null;
    return (session.elapsedSeconds ?? 0) / 60; // minutes
  }

  function startTimer(key, expectedMins) {
    const parts = key.split('_');
    const weekId = parts[1] ?? null;
    const paperIndex = parseInt(parts[2] ?? '0');
    startSession({
      paperPath: null, subject: null, displayName: key,
      weekId, paperIndex, source: 'legacy',
    }, expectedMins);
  }

  function stopTimer(key) {
    if (_matchesKey(key)) stopSession();
  }

  const value = {
    session,
    isFullscreen,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    setFullscreen: setIsFullscreen,
    getTimerData,
    getElapsed,
    startTimer,
    stopTimer,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
