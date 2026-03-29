import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { authConfig } from './auth.config.js';

export function signAccessToken(payload: object, expiresIn?: string): string {
  const key = authConfig.JWT_ACCESS_PRIVATE_KEY;
  const expires = expiresIn ?? authConfig.ACCESS_TOKEN_EXPIRY;
  const opts = { algorithm: authConfig.JWT_ALGORITHM, expiresIn: expires } as SignOptions;
  if (key) {
    return jwt.sign(payload, key as Secret, opts);
  }
  return jwt.sign(payload, (process.env.JWT_SECRET ?? 'secret') as Secret, opts);
}
