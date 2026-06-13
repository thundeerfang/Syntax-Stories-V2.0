import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { UserModel, type IUserPasskey } from '../../models/User.js';
import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
import {
  getWebAuthnOrigin,
  getWebAuthnRpId,
  PASSKEY_CHALLENGE_TTL_SEC,
  WEBAUTHN_RP_NAME,
} from './webauthn.config.js';

function rpConfig() {
  return {
    rpName: WEBAUTHN_RP_NAME,
    rpID: getWebAuthnRpId(),
  };
}

async function storeChallenge(key: string, challenge: string): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error('Redis required for passkey ceremonies');
  await redis.setEx(key, PASSKEY_CHALLENGE_TTL_SEC, challenge);
}

async function consumeChallenge(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const challenge = await redis.get(key);
  if (challenge) await redis.del(key);
  return challenge;
}

export async function getPasskeyStatus(userId: string) {
  const user = await UserModel.findById(userId).select('passkeys passkeyStepUpEnabled twoFactorEnabled');
  if (!user) return null;
  const passkeys = user.passkeys ?? [];
  return {
    registered: passkeys.length > 0,
    count: passkeys.length,
    stepUpEnabled: Boolean(user.passkeyStepUpEnabled),
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    devices: passkeys.map((p) => ({
      credentialId: p.credentialId,
      deviceLabel: p.deviceLabel,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt ?? null,
    })),
  };
}

export async function createPasskeyRegistrationOptions(userId: string, userEmail: string) {
  const user = await UserModel.findById(userId).select('passkeys username fullName');
  if (!user) throw new Error('User not found');

  const options = await generateRegistrationOptions({
    ...rpConfig(),
    userName: userEmail,
    userDisplayName: user.fullName || user.username,
    userID: new Uint8Array(Buffer.from(userId, 'utf8')),
    attestationType: 'none',
    excludeCredentials: (user.passkeys ?? []).map((p) => ({
      id: p.credentialId,
      transports: ['internal', 'hybrid'] as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
  });

  await storeChallenge(redisKeys.auth.passkeyRegister(userId), options.challenge);
  return options;
}

export async function verifyPasskeyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceLabel?: string
): Promise<void> {
  const expectedChallenge = await consumeChallenge(redisKeys.auth.passkeyRegister(userId));
  if (!expectedChallenge) throw new Error('Registration challenge expired');

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getWebAuthnOrigin(),
    expectedRPID: getWebAuthnRpId(),
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Passkey registration failed');
  }

  const { credential, credentialDeviceType } = verification.registrationInfo;
  const label =
    deviceLabel?.trim() ||
    (credentialDeviceType === 'multiDevice' ? 'Passkey (synced)' : 'Touch ID / this Mac');

  const entry: IUserPasskey = {
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64url'),
    counter: credential.counter,
    deviceLabel: label,
    createdAt: new Date(),
  };

  await UserModel.updateOne(
    { _id: userId },
    {
      $push: { passkeys: entry },
      $set: { passkeyStepUpEnabled: true },
    }
  );
}

export async function setPasskeyStepUpEnabled(userId: string, enabled: boolean): Promise<void> {
  const user = await UserModel.findById(userId).select('passkeys');
  if (!user) throw new Error('User not found');
  if (enabled && !(user.passkeys?.length ?? 0)) {
    throw new Error('Register a passkey before enabling biometric step-up');
  }
  await UserModel.updateOne({ _id: userId }, { $set: { passkeyStepUpEnabled: enabled } });
}

export async function removePasskey(userId: string, credentialId?: string): Promise<void> {
  if (credentialId) {
    await UserModel.updateOne({ _id: userId }, { $pull: { passkeys: { credentialId } } });
  } else {
    await UserModel.updateOne({ _id: userId }, { $set: { passkeys: [], passkeyStepUpEnabled: false } });
  }
  const user = await UserModel.findById(userId).select('passkeys');
  if (user && (user.passkeys?.length ?? 0) === 0) {
    await UserModel.updateOne({ _id: userId }, { $set: { passkeyStepUpEnabled: false } });
  }
}

export async function createPasskeyStepUpOptions(userId: string, sessionId: string) {
  const user = await UserModel.findById(userId).select('passkeys passkeyStepUpEnabled email');
  if (!user) throw new Error('User not found');
  if (!user.passkeyStepUpEnabled || !(user.passkeys?.length ?? 0)) {
    throw new Error('Biometric step-up is not enabled for this account');
  }

  const options = await generateAuthenticationOptions({
    ...rpConfig(),
    allowCredentials: (user.passkeys ?? []).map((p) => ({
      id: p.credentialId,
      transports: ['internal', 'hybrid'] as AuthenticatorTransportFuture[],
    })),
    userVerification: 'required',
  });

  await storeChallenge(redisKeys.auth.passkeyStepUp(sessionId), options.challenge);
  return options;
}

export async function verifyPasskeyStepUp(
  userId: string,
  sessionId: string,
  response: AuthenticationResponseJSON
): Promise<void> {
  const expectedChallenge = await consumeChallenge(redisKeys.auth.passkeyStepUp(sessionId));
  if (!expectedChallenge) throw new Error('Step-up challenge expired');

  const user = await UserModel.findById(userId).select('passkeys');
  if (!user?.passkeys?.length) throw new Error('No passkey registered');

  const passkey = user.passkeys.find((p) => p.credentialId === response.id);
  if (!passkey) throw new Error('Unknown passkey');

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getWebAuthnOrigin(),
    expectedRPID: getWebAuthnRpId(),
    requireUserVerification: true,
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, 'base64url'),
      counter: passkey.counter,
      transports: ['internal', 'hybrid'],
    },
  });

  if (!verification.verified) throw new Error('Biometric verification failed');

  await UserModel.updateOne(
    { _id: userId, 'passkeys.credentialId': passkey.credentialId },
    {
      $set: {
        'passkeys.$.counter': verification.authenticationInfo.newCounter,
        'passkeys.$.lastUsedAt': new Date(),
      },
    }
  );
}

export function userHasPasskeyStepUp(user: {
  passkeys?: IUserPasskey[];
  passkeyStepUpEnabled?: boolean;
}): boolean {
  return Boolean(user.passkeyStepUpEnabled && (user.passkeys?.length ?? 0) > 0);
}
