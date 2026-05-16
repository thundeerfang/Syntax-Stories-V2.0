import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthHome } from '@/screens/AuthHome';
import { Dashboard } from '@/screens/Dashboard';
import { SignIn } from '@/screens/SignIn';
import { SignUp } from '@/screens/SignUp';
import { TwoFactor } from '@/screens/TwoFactor';
import { VerifyCode } from '@/screens/VerifyCode';

function BootSplash() {
  return (
    <div className="retro-center">
      <p className="retro-title" style={{ fontSize: '1.8rem' }}>
        BOOTSTRAPPING...
      </p>
      <p className="retro-sub">Loading session</p>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return <BootSplash />;
  if (!user) return <Navigate to="/home" replace />;
  return children;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return <BootSplash />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { bootstrapping, user } = useAuth();

  return (
    <div className="retro-app">
      <div className="retro-scanlines" aria-hidden />
      <Routes>
        <Route
          path="/"
          element={
            bootstrapping ? <BootSplash /> : user ? <Navigate to="/dashboard" replace /> : <Navigate to="/home" replace />
          }
        />
        <Route
          path="/home"
          element={
            <RedirectIfAuthed>
              <AuthHome />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/sign-in"
          element={
            <RedirectIfAuthed>
              <SignIn />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/sign-up"
          element={
            <RedirectIfAuthed>
              <SignUp />
            </RedirectIfAuthed>
          }
        />
        <Route path="/verify" element={<VerifyCode />} />
        <Route path="/2fa" element={<TwoFactor />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
