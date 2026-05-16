import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getSession,
  onAuthStateChange,
  signInWithEmail,
  signOut as authSignOut,
  signUpWithEmail,
  resetPassword,
} from '../services/authService';
import { getProfileByUserId } from '../services/profileService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    setProfileLoading(true);
    try {
      const data = await getProfileByUserId(userId);
      setProfile(data);
      return data;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const clearAuth = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const currentSession = await getSession();
        if (!mounted) return;

        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        }
      } catch {
        if (mounted) clearAuth();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const subscription = onAuthStateChange(async (nextSession) => {
      if (!mounted) return;

      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        await loadProfile(nextUser.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, clearAuth]);

  const signIn = useCallback(
    async (email, password) => {
      const { session: newSession, user: newUser } = await signInWithEmail(
        email,
        password,
      );

      setSession(newSession);
      setUser(newUser);

      const userProfile = newUser ? await loadProfile(newUser.id) : null;

      return {
        session: newSession,
        user: newUser,
        profile: userProfile,
      };
    },
    [loadProfile],
  );

  const signUp = useCallback(async (credentials) => {
    const data = await signUpWithEmail(credentials);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    clearAuth();
  }, [clearAuth]);

  const sendPasswordReset = useCallback(async (email) => {
    await resetPassword(email);
  }, []);

  const role = profile?.role ?? null;

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      role,
      loading,
      profileLoading,
      isAuthenticated: Boolean(user && session),
      isReady: !loading && (!user || !profileLoading),
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      refreshProfile: () => (user ? loadProfile(user.id) : Promise.resolve(null)),
    }),
    [
      user,
      session,
      profile,
      role,
      loading,
      profileLoading,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      loadProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
