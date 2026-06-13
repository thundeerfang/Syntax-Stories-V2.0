/// Title-case user-facing copy — capitalize the first letter of each word.
String formatUserMessage(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return trimmed;

  final buffer = StringBuffer();
  for (final match in RegExp(r'\S+|\s+').allMatches(trimmed)) {
    final part = match.group(0)!;
    if (RegExp(r'^\s+$').hasMatch(part)) {
      buffer.write(part);
    } else {
      buffer.write(_titleToken(part));
    }
  }
  return buffer.toString();
}

String _titleToken(String token) {
  if (token.contains('-')) {
    return token.split('-').map(_titleToken).join('-');
  }
  if (token.contains('…')) {
    final idx = token.indexOf('…');
    return '${_titleToken(token.substring(0, idx))}…';
  }
  // Keep short acronyms (URL, OTP, API).
  if (token.length <= 4 && token == token.toUpperCase() && RegExp(r'^[A-Z0-9]+$').hasMatch(token)) {
    return token;
  }
  if (token.isEmpty) return token;
  return token[0].toUpperCase() + token.substring(1).toLowerCase();
}
