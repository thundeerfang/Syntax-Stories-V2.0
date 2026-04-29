/** Persist OAuth provider access tokens encrypted when `OAUTH_PROVIDER_TOKEN_KEY` is set (32-byte key, base64 or hex). */
export declare function sealProviderToken(plain: string | undefined | null): string | undefined;
/** Decrypt sealed token, or return legacy plaintext if not prefixed. */
export declare function unsealProviderToken(sealed: string | undefined | null): string | undefined;
//# sourceMappingURL=providerTokenCrypto.d.ts.map