import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthHttpError } from '@/api/authClient';
import { RetroPanel } from '@/components/RetroPanel';
import { useAuth } from '@/context/AuthContext';

type Loc = { mode?: 'signin' | 'signup' };

export function VerifyCode() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: Loc };
  const mode = loc.state?.mode ?? 'signin';
  const { pendingEmail, submitOtp, busy } = useAuth();
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);

  if (!pendingEmail) {
    return (
      <div className="retro-stack">
        <p>No pending verification. Return home.</p>
        <button type="button" className="retro-btn" onClick={() => nav('/home', { replace: true })}>
          OK
        </button>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (code.trim().length < 4) {
      setErr('Enter the code');
      return;
    }
    try {
      const next = await submitOtp(code);
      if (next === '2fa') {
        nav('/2fa', { replace: true });
        return;
      }
      nav('/dashboard', { replace: true });
    } catch (ex) {
      setErr(ex instanceof AuthHttpError ? ex.message : 'Verification failed');
    }
  }

  return (
    <div className="retro-stack">
      <div className="retro-bar">
        <button type="button" className="retro-linkish" onClick={() => nav(-1)}>
          ← BACK
        </button>
        <h1>{mode === 'signup' ? 'CONFIRM SIGN UP' : 'CONFIRM SIGN IN'}</h1>
        <span />
      </div>
      <form onSubmit={onSubmit}>
        <RetroPanel title="one-time code">
          <p className="retro-row">
            &gt; SENT TO
            <br />
            {pendingEmail}
          </p>
          <div className="retro-field" style={{ marginTop: 16 }}>
            <label htmlFor="code">CODE</label>
            <input
              id="code"
              className="retro-input retro-input--code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          {err ? (
            <p style={{ color: 'var(--retro-danger)', marginTop: 12 }}>{err}</p>
          ) : null}
          <button type="submit" className="retro-btn" style={{ width: '100%', marginTop: 20 }} disabled={busy}>
            {busy ? 'VERIFYING...' : 'VERIFY'}
          </button>
        </RetroPanel>
      </form>
    </div>
  );
}
