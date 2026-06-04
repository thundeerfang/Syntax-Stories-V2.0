import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import { apiUrl } from '@/lib/api';
import { adminFetchCredentials } from '@/lib/auth/adminFetchDefaults';

const PREFER_PASSKEY_KEY = 'syntax-admin-prefer-passkey-stepup';

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export type PasskeyStatus = {
  enabled: boolean;
  registered: boolean;
  count: number;
  stepUpEnabled: boolean;
  twoFactorEnabled?: boolean;
  devices?: Array<{
    credentialId: string;
    deviceLabel: string;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
};

export async function fetchPasskeyStatus(token: string | null): Promise<PasskeyStatus> {
  const res = await fetch(apiUrl('/auth/passkey/status'), {
    credentials: adminFetchCredentials(),
    headers: authHeaders(token),
  });
  const json = (await res.json()) as PasskeyStatus & { success?: boolean; message?: string };
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? 'Could not load passkey status');
  }
  return json;
}

/** True when the browser can use built-in biometrics (Touch ID on MacBook, etc.). */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }
  return false;
}

export function getPreferPasskeyStepUp(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PREFER_PASSKEY_KEY) === '1';
}

export function setPreferPasskeyStepUp(prefer: boolean): void {
  if (typeof window === 'undefined') return;
  if (prefer) localStorage.setItem(PREFER_PASSKEY_KEY, '1');
  else localStorage.removeItem(PREFER_PASSKEY_KEY);
}

export async function registerPasskey(
  token: string | null,
  deviceLabel?: string
): Promise<void> {
  const optRes = await fetch(apiUrl('/auth/passkey/register/options'), {
    method: 'POST',
    credentials: adminFetchCredentials(),
    headers: authHeaders(token),
  });
  const optJson = (await optRes.json()) as {
    success?: boolean;
    options?: PublicKeyCredentialCreationOptionsJSON;
    message?: string;
  };
  if (!optRes.ok || !optJson.options) {
    throw new Error(optJson.message ?? 'Could not start passkey registration');
  }

  const attestation = await startRegistration({ optionsJSON: optJson.options });

  const verifyRes = await fetch(apiUrl('/auth/passkey/register/verify'), {
    method: 'POST',
    credentials: adminFetchCredentials(),
    headers: authHeaders(token),
    body: JSON.stringify({ response: attestation, deviceLabel }),
  });
  const verifyJson = (await verifyRes.json()) as { success?: boolean; message?: string };
  if (!verifyRes.ok || !verifyJson.success) {
    throw new Error(verifyJson.message ?? 'Passkey registration failed');
  }
}

export async function setPasskeyStepUpPreference(
  token: string | null,
  stepUpEnabled: boolean
): Promise<void> {
  const res = await fetch(apiUrl('/auth/passkey/preferences'), {
    method: 'PATCH',
    credentials: adminFetchCredentials(),
    headers: authHeaders(token),
    body: JSON.stringify({ stepUpEnabled }),
  });
  const json = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || !json.success) throw new Error(json.message ?? 'Could not update preference');
}

export async function removePasskey(token: string | null, credentialId?: string): Promise<void> {
  const res = await fetch(apiUrl('/auth/passkey/remove'), {
    method: 'POST',
    credentials: adminFetchCredentials(),
    headers: authHeaders(token),
    body: JSON.stringify(credentialId ? { credentialId } : {}),
  });
  const json = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || !json.success) throw new Error(json.message ?? 'Could not remove passkey');
}

export async function submitStepUpPasskey(token: string | null): Promise<void> {
  const optRes = await fetch(apiUrl('/auth/2fa/step-up/passkey/options'), {
    method: 'POST',
    credentials: adminFetchCredentials(),
    headers: authHeaders(token),
  });
  const optJson = (await optRes.json()) as {
    success?: boolean;
    options?: PublicKeyCredentialRequestOptionsJSON;
    message?: string;
  };
  if (!optRes.ok || !optJson.options) {
    throw new Error(optJson.message ?? 'Biometric step-up unavailable');
  }

  let assertion: AuthenticationResponseJSON;
  try {
    assertion = await startAuthentication({ optionsJSON: optJson.options });
  } catch (e) {
    if (e instanceof Error && e.name === 'NotAllowedError') {
      throw new Error('Biometric verification was cancelled');
    }
    throw e;
  }

  const verifyRes = await fetch(apiUrl('/auth/2fa/step-up/passkey/verify'), {
    method: 'POST',
    credentials: adminFetchCredentials(),
    headers: authHeaders(token),
    body: JSON.stringify({ response: assertion }),
  });
  const verifyJson = (await verifyRes.json()) as { success?: boolean; message?: string };
  if (!verifyRes.ok || !verifyJson.success) {
    throw new Error(verifyJson.message ?? 'Biometric verification failed');
  }
}
