/// Matches server `REFERRAL_CODE_REGEX` (Crockford base32).
final _referralCodeRegex = RegExp(r'^[0-9A-HJKMNP-TV-Z]{8,16}$');

String? normalizeReferralCode(String raw) {
  final code = raw.trim().toUpperCase();
  if (code.length < 8 || code.length > 16) return null;
  if (!_referralCodeRegex.hasMatch(code)) return null;
  return code;
}

String? referralCodeFormatMessage(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;
  if (trimmed.length < 8) return 'Referral code must be at least 8 characters.';
  if (trimmed.length > 16) return 'Referral code must be at most 16 characters.';
  if (!_referralCodeRegex.hasMatch(trimmed.toUpperCase())) {
    return 'Use letters and numbers only (no I, L, O, or U).';
  }
  return null;
}
