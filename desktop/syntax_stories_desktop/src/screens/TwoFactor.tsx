import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthHttpError } from '@/api/authClient';
import { RetroPanel } from '@/components/RetroPanel';
import { useAuth } from '@/context/AuthContext';

export function TwoFactor() {
  const nav = useNavigate();
  const { twoFactorChallengeToken, submitTwoFactor, busy } = useAuth();
  const [token, setToken] = useState('');
  const [err, setErr] = useState<string | null>(null);

  if (!twoFactorChallengeToken) {
    return (
      <div className="retro-stack">
        <p>No 2FA challenge.</p>
        <button type="button" className="retro-btn" onClick={() => nav('/home', { replace: true })}>
          HOME
        </button>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (token.trim().length < 6) {
      setErr('Enter 6-digit code');
      return;
    }
    try {
      await submitTwoFactor(token);
      nav('/dashboard', { replace: true });
    } catch (ex) {
      setErr(ex instanceof AuthHttpError ? ex.message : '2FA failed');
    }
  }

  return (
    <div className="retro-stack">
      <div className="retro-bar">
        <button type="button" className="retro-linkish" onClick={() => nav(-1)}>
          ← BACK
        </button>
        <h1>2FA</h1>
        <span />
      </div>
      <form onSubmit={onSubmit}>
        <RetroPanel title="authenticator" variant="amber">
          <p className="retro-row">&gt; ENTER TOTP FROM YOUR APP</p>
          <div className="retro-field" style={{ marginTop: 16 }}>
            <label htmlFor="totp">6-DIGIT CODE</label>
            <input
              id="totp"
              className="retro-input retro-input--code"
              inputMode="numeric"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>
          {err ? (
            <p style={{ color: 'var(--retro-danger)', marginTop: 12 }}>{err}</p>
          ) : null}
          <button type="submit" className="retro-btn" style={{ width: '100%', marginTop: 20 }} disabled={busy}>
            {busy ? '...' : 'UNLOCK'}
          </button>
        </RetroPanel>
      </form>
    </div>
  );
}
