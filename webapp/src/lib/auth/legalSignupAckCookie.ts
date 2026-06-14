export const LEGAL_SIGNUP_ACK_COOKIE = "syntax_legal_signup_ack";
export function setLegalSignupAckCookie(): void {
  if (typeof document === "undefined") return;
  const maxAge = 900;
  const secure = globalThis.location?.protocol === "https:";
  document.cookie = `${LEGAL_SIGNUP_ACK_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
export function clearLegalSignupAckCookie(): void {
  if (typeof document === "undefined") return;
  const secure = globalThis.location?.protocol === "https:";
  document.cookie = `${LEGAL_SIGNUP_ACK_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure ? "; Secure" : ""}`;
}
