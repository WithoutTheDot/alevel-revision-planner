import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getPendingNudges, clearNudge } from '../firebase/db';

const NudgeContext = createContext({ nudges: [], dismiss: () => {} });

export function NudgeProvider({ children }) {
  const { currentUser } = useAuth();
  const [nudges, setNudges] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    getPendingNudges(currentUser.uid)
      .then(setNudges)
      .catch(() => {});
  }, [currentUser]);

  const dismiss = useCallback(async (id) => {
    if (!currentUser) return;
    try {
      await clearNudge(currentUser.uid, id);
    } catch {}
    setNudges((prev) => prev.filter((n) => n.id !== id));
  }, [currentUser]);

  return (
    <NudgeContext.Provider value={{ nudges, dismiss }}>
      {children}
    </NudgeContext.Provider>
  );
}

export function useNudges() {
  return useContext(NudgeContext);
}
