/** Use cookies on cross-origin admin API when httpOnly session is enabled server-side. */
export function adminFetchCredentials(): RequestCredentials {
  return process.env.NEXT_PUBLIC_ADMIN_HTTPONLY_COOKIES === 'true' ? 'include' : 'same-origin';
}
