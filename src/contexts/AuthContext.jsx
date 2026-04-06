import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { initDefaultTemplates, initDefaultDurations, initDefaultProfile, getUserProfile, initPublicStats } from '../firebase/db';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return; }
    try {
      const p = await getUserProfile(uid);
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  async function register(email, password) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const defaultDisplayName = email.split('@')[0];
    await Promise.all([
      initDefaultTemplates(credential.user.uid),
      initDefaultDurations(credential.user.uid),
      initDefaultProfile(credential.user.uid),
      initPublicStats(credential.user.uid, defaultDisplayName),
    ]);
    await refreshProfile(credential.user.uid);
    return credential;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setProfile(null);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await refreshProfile(user.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [refreshProfile]);

  const value = {
    currentUser,
    profile,
    refreshProfile: () => refreshProfile(currentUser?.uid),
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
