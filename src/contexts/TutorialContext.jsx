import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { saveUserProfile } from '../firebase/db';
import { TUTORIAL_STEPS } from '../lib/tutorialSteps';

const TutorialContext = createContext(null);

const LS_KEY = 'tutorial_state';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveToStorage(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

function clearStorage() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

export function TutorialProvider({ children }) {
  const { currentUser, profile } = useAuth();
  const navigate = useNavigate();

  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [actionDone, setActionDone] = useState(false);

  // Ref to hold a pending navigation route (set by advance(), consumed by effect)
  const pendingNavRef = useRef(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved?.active) {
      setActive(true);
      setCurrentStep(saved.currentStep ?? 0);
      // If restoring mid-tutorial, navigate to the correct page
      const step = TUTORIAL_STEPS[saved.currentStep ?? 0];
      if (step?.route) pendingNavRef.current = step.route;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only — intentionally no deps

  // Guard: if Firestore says tutorial is done, clear everything
  useEffect(() => {
    if (profile?.tutorialComplete === true) {
      clearStorage();
      setActive(false);
    }
  }, [profile]);

  // Persist state
  useEffect(() => {
    if (active) saveToStorage({ active: true, currentStep });
  }, [active, currentStep]);

  // Navigate when pendingNavRef is set (by advance() or mount restore)
  useEffect(() => {
    if (pendingNavRef.current) {
      navigate(pendingNavRef.current);
      pendingNavRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]); // runs after currentStep updates

  const start = useCallback(() => {
    saveToStorage({ active: true, currentStep: 0 });
    setActive(true);
    setCurrentStep(0);
    setActionDone(false);
    // Navigation handled by the caller (OnboardingPage navigates to /dashboard)
  }, []);

  const advance = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= TUTORIAL_STEPS.length) return prev;
      const nextStep = TUTORIAL_STEPS[next];
      if (nextStep.route) pendingNavRef.current = nextStep.route;
      return next;
    });
    setActionDone(false);
  }, []);

  const _finish = useCallback(async () => {
    clearStorage();
    setActive(false);
    if (currentUser) {
      try { await saveUserProfile(currentUser.uid, { tutorialComplete: true }); } catch {}
    }
  }, [currentUser]);

  const notifyActionDone = useCallback(() => setActionDone(true), []);

  const step = TUTORIAL_STEPS[currentStep] ?? null;

  return (
    <TutorialContext.Provider value={{
      active, step, currentStep, actionDone,
      start, advance, skip: _finish, complete: _finish,
      notifyActionDone, totalSteps: TUTORIAL_STEPS.length,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used inside TutorialProvider');
  return ctx;
}
