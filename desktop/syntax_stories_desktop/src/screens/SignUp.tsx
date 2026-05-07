import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthHttpError } from '@/api/authClient';
import { RetroPanel } from '@/components/RetroPanel';
import { useAuth } from '@/context/AuthContext';

export function SignUp() {
  const nav = useNavigate();
  const { sendSignupOtp, busy } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (fullName.trim().length < 2) {
      setErr('Enter your name');
      return;
    }
    if (!email.includes('@')) {
      setErr('Enter a valid email');
      return;
    }
    try {
      await sendSignupOtp(fullName, email);
      nav('/verify', { state: { mode: 'signup' as const } });
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
        <h1>SIGN UP</h1>
        <span />
      </div>
      <form onSubmit={onSubmit}>
        <RetroPanel title="register" variant="amber">
          <div className="retro-field">
            <label htmlFor="name">FULL NAME</label>
            <input
              id="name"
              className="retro-input"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="retro-field" style={{ marginTop: 16 }}>
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
        <Link to="/sign-in" className="retro-linkish">
          Already registered?
        </Link>
      </p>
    </div>
  );
}
