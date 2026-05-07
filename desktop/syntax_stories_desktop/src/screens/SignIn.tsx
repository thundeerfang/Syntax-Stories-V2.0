import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthHttpError } from '@/api/authClient';
import { RetroPanel } from '@/components/RetroPanel';
import { useAuth } from '@/context/AuthContext';

export function SignIn() {
  const nav = useNavigate();
  const { sendLoginOtp, busy } = useAuth();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.includes('@')) {
      setErr('Enter a valid email');
      return;
    }
    try {
      await sendLoginOtp(email);
      nav('/verify', { state: { mode: 'signin' as const } });
    } catch (ex) {
      setErr(ex instanceof AuthHttpError ? ex.message : 'Request failed');
    }
  }

  return (
    <div className="retro-stack">
      <div className="retro-bar">
        <button type="button" className="retro-linkish" onClick={() => nav(-1)}>
          ← BACK
        </button>
        <h1>SIGN IN</h1>
        <span />
      </div>
      <form onSubmit={onSubmit}>
        <RetroPanel title="email otp">
          <div className="retro-field">
            <label htmlFor="email">EMAIL</label>
            <input
              id="email"
              className="retro-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {err ? (
            <p style={{ color: 'var(--retro-danger)', marginTop: 12 }}>{err}</p>
          ) : null}
          <button type="submit" className="retro-btn" style={{ width: '100%', marginTop: 20 }} disabled={busy}>
            {busy ? 'SENDING...' : 'SEND CODE'}
          </button>
        </RetroPanel>
      </form>
      <p style={{ textAlign: 'center' }}>
        <Link to="/sign-up" className="retro-linkish">
          Need an account?
        </Link>
      </p>
    </div>
  );
}
