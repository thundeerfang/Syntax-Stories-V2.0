import { apiUrl } from '@/lib/api';

type ApiErr = { success?: boolean; error?: { message?: string }; message?: string };

function throwFrom(res: Response, json: ApiErr): never {
  throw new Error(json.error?.message ?? json.message ?? res.statusText);
}

export async function sendAdminInviteOtp(
  token: string,
  email: string
): Promise<{ otpVersion: number; expiresInSeconds: number }> {
  const res = await fetch(apiUrl('/api/v1/admin/management/admin-users/send-invite-otp'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const json = (await res.json()) as ApiErr & {
    success?: boolean;
    data?: { otpVersion: number; expiresInSeconds: number };
  };
  if (!res.ok || !json.success || !json.data) throwFrom(res, json);
  return json.data;
}

export async function verifyAdminInviteOtp(
  token: string,
  body: { email: string; code: string; otpVersion?: number }
): Promise<{ emailVerificationToken: string; expiresInSeconds: number }> {
  const res = await fetch(apiUrl('/api/v1/admin/management/admin-users/verify-invite-otp'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      code: body.code.replace(/\D/g, '').slice(0, 6),
      otpVersion: body.otpVersion,
    }),
  });
  const json = (await res.json()) as ApiErr & {
    success?: boolean;
    data?: { emailVerificationToken: string; expiresInSeconds: number };
  };
  if (!res.ok || !json.success || !json.data) throwFrom(res, json);
  return json.data;
}
