import { RetroPanel } from '@/components/RetroPanel';
import { useAuth } from '@/context/AuthContext';

function displayName(u: { fullName?: string; username?: string; email: string }): string {
  if (u.fullName?.trim()) return u.fullName.trim();
  if (u.username?.trim()) return u.username.trim();
  return u.email;
}

export function Dashboard() {
  const { user, logout, busy } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="retro-stack">
      <div className="retro-bar">
        <span />
        <h1>DASHBOARD</h1>
        <button type="button" onClick={() => void logout()} disabled={busy}>
          LOGOUT
        </button>
      </div>
      <RetroPanel title="operator">
        <p className="retro-row">
          <span>NAME: </span>
          <span style={{ color: 'var(--retro-glow)' }}>{displayName(user)}</span>
        </p>
        <p className="retro-row" style={{ marginTop: 8 }}>
          <span>EMAIL: </span>
          <span style={{ color: 'var(--retro-glow)' }}>{user.email}</span>
        </p>
        {user.username ? (
          <p className="retro-row" style={{ marginTop: 8 }}>
            <span>USERNAME: </span>
            <span style={{ color: 'var(--retro-glow)' }}>{user.username}</span>
          </p>
        ) : null}
        <p className="retro-row" style={{ marginTop: 8 }}>
          <span>USER ID: </span>
          <span style={{ color: 'var(--retro-glow)' }}>{user._id}</span>
        </p>
      </RetroPanel>
      <RetroPanel title="status" variant="amber">
        <p className="retro-row">&gt; SESSION ACTIVE</p>
        <p className="retro-hint" style={{ marginTop: 8 }}>
          {'// Profile from GET /auth/me'}
        </p>
      </RetroPanel>
      <p className="retro-hint" style={{ textAlign: 'center' }}>
        Electron · {window.syntaxStoriesDesktop?.platform ?? 'unknown'}
      </p>
    </div>
  );
}
