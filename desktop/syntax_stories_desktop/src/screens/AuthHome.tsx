import { Link } from 'react-router-dom';
import { RetroPanel } from '@/components/RetroPanel';

export function AuthHome() {
  return (
    <div className="retro-stack">
      <h1 className="retro-title">SYNTAX STORIES</h1>
      <p className="retro-sub">DESKTOP TERMINAL v1.0</p>
      <RetroPanel title="session">
        <p className="retro-row" style={{ marginBottom: 16 }}>
          &gt; AWAITING CREDENTIALS
        </p>
        <Link to="/sign-in" className="retro-btn" style={{ textAlign: 'center', textDecoration: 'none' }}>
          SIGN IN
        </Link>
        <Link
          to="/sign-up"
          className="retro-btn retro-btn--outline"
          style={{ textAlign: 'center', textDecoration: 'none', marginTop: 12 }}
        >
          CREATE ACCOUNT
        </Link>
      </RetroPanel>
      <p className="retro-hint">
        // API: /auth/send-otp · /auth/signup-email · /auth/verify-otp (same as webapp)
      </p>
    </div>
  );
}
