import crypto from 'node:crypto';
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';

/**
 * Default profile image as a data URI (SVG via DiceBear Adventurer).
 * Deterministic for the same seed; safe to store on `User.profileImg`.
 */
export function diceBearAvatarSvgUrl(seed: string): string {
  const s = seed.trim() || 'user';
  const avatar = createAvatar(adventurer, { seed: s });
  return avatar.toDataUri();
}

/** Random default avatar for new signups (persist on `User.profileImg`). */
export function newRandomDiceBearAvatarSvgUrl(): string {
  return diceBearAvatarSvgUrl(crypto.randomUUID());
}
