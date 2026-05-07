import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authClient, AuthHttpError } from '@/api/authClient';
import { tokenStorage } from '@/lib/tokenStorage';
import type { AccountUser } from '@/types/auth';

type AuthContextValue = {
  bootstrapping: boolean;
  busy: boolean;
  user: AccountUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  pendingEmail: string | null;
  pendingOtpVersion: number | null;
  pendingFullName: string | null;
  twoFactorChallengeToken: string | null;
  apiBase: string;
  sendLoginOtp: (email: string) => Promise<void>;
  sendSignupOtp: (fullName: string, email: string) => Promise<void>;
  submitOtp: (code: string) => Promise<'ok' | '2fa'>;
  submitTwoFactor: (totp: string) => Promise<void>;
  logout: () => Promise<void>;
  clearOtpFlow: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingOtpVersion, setPendingOtpVersion] = useState<number | null>(null);
  const [pendingFullName, setPendingFullName] = useState<string | null>(null);
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState<string | null>(null);

  const applySession = useCallback(async (access: string, refresh?: string | null) => {
    tokenStorage.setTokens(access, refresh);
    setAccessToken(access);
    setRefreshToken(refresh ?? null);
    const me = await authClient.getMe(access);
    setUser(me);
    setPendingEmail(null);
    setPendingOtpVersion(null);
    setPendingFullName(null);
    setTwoFactorChallengeToken(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let at = tokenStorage.getAccess();
      const rt = tokenStorage.getRefresh();
      if (!at) {
        if (!cancelled) setBootstrapping(false);
        return;
      }
      try {
        const me = await authClient.getMe(at);
        if (!cancelled) {
          setAccessToken(at);
          setRefreshToken(rt);
          setUser(me);
        }
      } catch (e) {
        if (e instanceof AuthHttpError && e.status === 401 && rt) {
          try {
            const out = await authClient.refresh(rt);
            at = out.accessToken;
            await applySession(at, rt);
          } catch {
            tokenStorage.clear();
            if (!cancelled) {
              setAccessToken(null);
              setRefreshToken(null);
              setUser(null);
            }
          }
        } else {
          tokenStorage.clear();
          if (!cancelled) {
            setAccessToken(null);
            setRefreshToken(null);
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const sendLoginOtp = useCallback(async (email: string) => {
    setBusy(true);
    try {
      const out = await authClient.sendOtp({ email: email.trim() });
      setPendingEmail(email.trim());
      setPendingOtpVersion(typeof out.otpVersion === 'number' ? out.otpVersion : null);
      setPendingFullName(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const sendSignupOtp = useCallback(async (fullName: string, email: string) => {
    setBusy(true);
    try {
      const out = await authClient.signupEmail({
        fullName: fullName.trim(),
        email: email.trim(),
      });
      setPendingEmail(email.trim());
      setPendingOtpVersion(typeof out.otpVersion === 'number' ? out.otpVersion : null);
      setPendingFullName(fullName.trim());
    } finally {
      setBusy(false);
    }
  }, []);

  const submitOtp = useCallback(
    async (code: string): Promise<'ok' | '2fa'> => {
      const email = pendingEmail;
      if (!email) throw new Error('No pending email');
      setBusy(true);
      try {
        const data = await authClient.verifyOtp({
          email,
          code: code.trim(),
          otpVersion: pendingOtpVersion ?? undefined,
        });
        if (data.twoFactorRequired) {
          const ch = data.challengeToken;
          if (!ch) throw new AuthHttpError('2FA required but no challenge token');
          setTwoFactorChallengeToken(ch);
          return '2fa';
        }
        const at = data.accessToken;
        if (!at) throw new AuthHttpError(data.message || 'No access token');
        await applySession(at, data.refreshToken);
        return 'ok';
      } finally {
        setBusy(false);
      }
    },
    [applySession, pendingEmail, pendingOtpVersion]
  );

  const submitTwoFactor = useCallback(
    async (totp: string) => {
      const ch = twoFactorChallengeToken;
      if (!ch) throw new Error('No 2FA challenge');
      setBusy(true);
      try {
        const data = await authClient.verifyTwoFactorLogin({
          challengeToken: ch,
          token: totp.trim(),
        });
        await applySession(data.accessToken, data.refreshToken);
      } finally {
        setBusy(false);
      }
    },
    [applySession, twoFactorChallengeToken]
  );

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      const at = accessToken;
      const rt = refreshToken;
      if (at) {
        try {
          await authClient.logout(at, rt);
        } catch {
          /* still clear locally */
        }
      }
      tokenStorage.clear();
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setTwoFactorChallengeToken(null);
      setPendingEmail(null);
      setPendingOtpVersion(null);
      setPendingFullName(null);
    } finally {
      setBusy(false);
    }
  }, [accessToken, refreshToken]);

  const clearOtpFlow = useCallback(() => {
    setPendingEmail(null);
    setPendingOtpVersion(null);
    setPendingFullName(null);
    setTwoFactorChallengeToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      bootstrapping,
      busy,
      user,
      accessToken,
      refreshToken,
      pendingEmail,
      pendingOtpVersion,
      pendingFullName,
      twoFactorChallengeToken,
      apiBase: import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:5000',
      sendLoginOtp,
      sendSignupOtp,
      submitOtp,
      submitTwoFactor,
      logout,
      clearOtpFlow,
    }),
    [
      bootstrapping,
      busy,
      user,
      accessToken,
      refreshToken,
      pendingEmail,
      pendingOtpVersion,
      pendingFullName,
      twoFactorChallengeToken,
      sendLoginOtp,
      sendSignupOtp,
      submitOtp,
      submitTwoFactor,
      logout,
      clearOtpFlow,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
