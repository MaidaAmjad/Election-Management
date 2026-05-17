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
  resetPasswordWithToken,
  updateUserPassword,
} from '../services/authService';
import { sendEmailOtp, verifyEmailOtp } from '../services/mfaService';
import {
  ensureProfileForUser,
  updateMfaEmailEnabled,
} from '../services/profileService';
import { resolveRole, normalizeRole } from '../utils/roleHelpers';
import { USER_ROLES } from '../utils/constants';
import { logAudit } from '../services/auditLogService';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../utils/auditConstants';
import {
  clearMfaVerified,
  isMfaVerified,
  setMfaVerified,
} from '../utils/mfaStorage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authEvent, setAuthEvent] = useState(null);
  const [mfaVerified, setMfaVerifiedState] = useState(false);

  const syncMfaVerified = useCallback((userId) => {
    setMfaVerifiedState(userId ? isMfaVerified(userId) : false);
  }, []);

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser?.id) {
      setProfile(null);
      return null;
    }

    setProfileLoading(true);
    try {
      const data = await ensureProfileForUser(authUser);
      setProfile(data);
      return data;
    } catch (err) {
      console.error('[Auth] Profile load failed:', err?.message ?? err);
      const fallbackRole = resolveRole(null, authUser);
      if (fallbackRole) {
        const fallbackProfile = {
          id: authUser.id,
          role: fallbackRole,
          full_name: authUser.user_metadata?.full_name ?? authUser.email,
          phone: authUser.user_metadata?.phone ?? '',
          mfa_email_enabled: false,
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
      }
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const clearAuth = useCallback(() => {
    if (user?.id) {
      clearMfaVerified(user.id);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setAuthEvent(null);
    setMfaVerifiedState(false);
  }, [user?.id]);

  const applySession = useCallback(
    async (event, nextSession) => {
      setAuthEvent(event);
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (nextUser && event !== 'PASSWORD_RECOVERY') {
        await loadProfile(nextUser);
        syncMfaVerified(nextUser.id);
      } else if (!nextUser) {
        setProfile(null);
        setMfaVerifiedState(false);
      }
    },
    [loadProfile, syncMfaVerified],
  );

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const currentSession = await getSession();
        if (!mounted) return;
        await applySession('INITIAL_SESSION', currentSession);
      } catch {
        if (mounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setMfaVerifiedState(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restoreSession();

    const subscription = onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;
      await applySession(event, nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const login = useCallback(
    async (email, password) => {
      const { session: newSession, user: newUser } = await signInWithEmail(
        email,
        password,
      );

      setSession(newSession);
      setUser(newUser);

      clearMfaVerified(newUser?.id);
      setMfaVerifiedState(false);

      const userProfile = newUser ? await loadProfile(newUser) : null;

      if (newUser) {
        try {
          await logAudit({
            userId: newUser.id,
            actionType: AUDIT_ACTIONS.USER_LOGIN,
            moduleName: AUDIT_MODULES.AUTHENTICATION,
            description: `${userProfile?.role ?? 'User'} signed in.`,
          });
        } catch (logErr) {
          console.error('[Auth] Login audit failed:', logErr?.message);
        }
      }

      return {
        session: newSession,
        user: newUser,
        profile: userProfile,
        requiresMfa: Boolean(userProfile?.mfa_email_enabled),
      };
    },
    [loadProfile],
  );

  const signup = useCallback(
    async (credentials) => {
      const data = await signUpWithEmail(credentials);
      let newSession = data.session;
      let newUser = data.user;

      if (!newSession && newUser && credentials.password) {
        try {
          const signedIn = await signInWithEmail(
            credentials.email,
            credentials.password,
          );
          newSession = signedIn.session;
          newUser = signedIn.user;
        } catch {
          /* sign-up succeeded; sign-in may fail if auth settings block immediate login */
        }
      }

      if (!newSession || !newUser) {
        return {
          session: null,
          user: newUser ?? null,
          profile: null,
          requiresMfa: false,
        };
      }

      setSession(newSession);
      setUser(newUser);
      clearMfaVerified(newUser.id);
      setMfaVerifiedState(false);

      const userProfile = await loadProfile(newUser);

      try {
        await logAudit({
          userId: newUser.id,
          actionType: AUDIT_ACTIONS.USER_SIGNUP,
          moduleName: AUDIT_MODULES.AUTHENTICATION,
          description: `New account registered: ${credentials.email}`,
        });
      } catch (logErr) {
        console.error('[Auth] Signup audit failed:', logErr?.message);
      }

      return {
        session: newSession,
        user: newUser,
        profile: userProfile,
        requiresMfa: Boolean(userProfile?.mfa_email_enabled),
      };
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    const userId = user?.id;
    if (userId) {
      try {
        await logAudit({
          userId,
          actionType: AUDIT_ACTIONS.USER_LOGOUT,
          moduleName: AUDIT_MODULES.AUTHENTICATION,
          description: 'User signed out.',
        });
      } catch (logErr) {
        console.error('[Auth] Logout audit failed:', logErr?.message);
      }
    }
    try {
      await authSignOut();
    } finally {
      if (userId) clearMfaVerified(userId);
      setUser(null);
      setSession(null);
      setProfile(null);
      setAuthEvent(null);
      setMfaVerifiedState(false);
    }
  }, [user?.id]);

  const sendPasswordReset = useCallback(async (email) => {
    await resetPassword(email);
  }, []);

  const updatePassword = useCallback(async (password) => {
    return updateUserPassword(password);
  }, []);

  const completePasswordReset = useCallback(async (token, password) => {
    await resetPasswordWithToken(token, password);
  }, []);

  const sendMfaOtp = useCallback(async (email) => {
    await sendEmailOtp(email);
  }, []);

  const verifyMfa = useCallback(
    async (email, token) => {
      await verifyEmailOtp(email, token);

      if (user?.id) {
        setMfaVerified(user.id);
        setMfaVerifiedState(true);
      }
    },
    [user?.id],
  );

  const setMfaEnabled = useCallback(
    async (enabled) => {
      if (!user?.id) throw new Error('Not authenticated');

      const updated = await updateMfaEmailEnabled(user.id, enabled);
      setProfile(updated);

      if (!enabled && user.id) {
        clearMfaVerified(user.id);
        setMfaVerifiedState(false);
      }

      return updated;
    },
    [user?.id],
  );

  const markMfaVerified = useCallback(() => {
    if (user?.id) {
      setMfaVerified(user.id);
      setMfaVerifiedState(true);
    }
  }, [user?.id]);

  const role = useMemo(() => resolveRole(profile, user), [profile, user]);
  const isPasswordRecovery = authEvent === 'PASSWORD_RECOVERY';
  const requiresMfa = Boolean(
    profile?.mfa_email_enabled && user && !mfaVerified && !isPasswordRecovery,
  );

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      role,
      loading,
      profileLoading,
      authEvent,
      isPasswordRecovery,
      mfaVerified,
      requiresMfa,
      isAuthenticated: Boolean(user && session),
      isReady: !loading && (!user || !profileLoading || isPasswordRecovery),
      login,
      signup,
      logout,
      sendPasswordReset,
      updatePassword,
      completePasswordReset,
      sendMfaOtp,
      verifyMfa,
      setMfaEnabled,
      markMfaVerified,
      refreshProfile: () => (user ? loadProfile(user) : Promise.resolve(null)),
    }),
    [
      user,
      session,
      profile,
      role,
      loading,
      profileLoading,
      authEvent,
      isPasswordRecovery,
      mfaVerified,
      requiresMfa,
      login,
      signup,
      logout,
      sendPasswordReset,
      updatePassword,
      completePasswordReset,
      sendMfaOtp,
      verifyMfa,
      setMfaEnabled,
      markMfaVerified,
      loadProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
