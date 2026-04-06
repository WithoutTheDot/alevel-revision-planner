import { createContext, useContext, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { saveUserProfile } from '../firebase/db';
import { DEFAULT_SUBJECTS, getNextColor } from '../lib/allSubjects';

const SubjectsContext = createContext(null);

export function useSubjects() {
  return useContext(SubjectsContext);
}

export function SubjectsProvider({ children }) {
  const { currentUser, profile, refreshProfile } = useAuth();

  // Fall back to 4 built-in subjects if no profile yet (existing users)
  const subjects = profile?.subjects ?? DEFAULT_SUBJECTS;

  // Keyed lookup: subjectMeta[id] = { label, color, text, light }
  const subjectMeta = useMemo(() => {
    const map = {};
    for (const s of subjects) {
      map[s.id] = { label: s.label, color: s.color, text: s.text, light: s.light };
    }
    return map;
  }, [subjects]);

  const addSubject = useCallback(async (subjectDef) => {
    if (!currentUser) return;
    const current = profile?.subjects ?? DEFAULT_SUBJECTS;
    if (current.find((s) => s.id === subjectDef.id)) return; // already added
    const palette = getNextColor(current);
    const newSubject = { id: subjectDef.id, label: subjectDef.label, ...palette };
    const updated = [...current, newSubject];
    await saveUserProfile(currentUser.uid, { subjects: updated });
    await refreshProfile();
  }, [currentUser, profile, refreshProfile]);

  const removeSubject = useCallback(async (id) => {
    if (!currentUser) return;
    const current = profile?.subjects ?? DEFAULT_SUBJECTS;
    const updated = current.filter((s) => s.id !== id);
    await saveUserProfile(currentUser.uid, { subjects: updated });
    await refreshProfile();
  }, [currentUser, profile, refreshProfile]);

  const value = { subjects, subjectMeta, addSubject, removeSubject };

  return (
    <SubjectsContext.Provider value={value}>
      {children}
    </SubjectsContext.Provider>
  );
}
