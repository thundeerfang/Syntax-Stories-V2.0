import 'dart:convert';

import '../utils/user_message_case.dart';

/// Shown in the UI — never include HTTP codes, URLs, or dev instructions.
const kGenericUserError = 'Something Went Wrong. Please Try Again.';

const _logName = 'SyntaxStoriesApi';

void logApiError(
  String context, {
  required String method,
  required Uri url,
  int? statusCode,
  String? responseBody,
  Object? cause,
}) {
  final buffer = StringBuffer()
    ..writeln(context)
    ..writeln('  $method $url');
  if (statusCode != null) buffer.writeln('  status: $statusCode');
  if (responseBody != null && responseBody.trim().isNotEmpty) {
    buffer.writeln('  body: $responseBody');
  }
  if (cause != null) buffer.writeln('  cause: $cause');
  _emitLog('ERROR', buffer.toString());
}

void logApiInfo(String message) {
  _emitLog('INFO', message);
}

void _emitLog(String level, String message) {
  // print() shows in `flutter run` / Xcode console; developer.log often does not.
  // ignore: avoid_print
  print('[$_logName][$level] $message');
}

String? parseServerMessage(String body) {
  if (body.trim().isEmpty) return null;
  try {
    final map = jsonDecode(body) as Map<String, dynamic>?;
    if (map == null) return null;
    final msg = map['message'] as String?;
    if (msg != null && msg.trim().isNotEmpty) return msg.trim();
    final err = map['error'];
    if (err is List && err.isNotEmpty) {
      final first = err.first;
      if (first is Map && first['message'] is String) {
        return (first['message'] as String).trim();
      }
    }
  } catch (_) {}
  return null;
}

/// Returns a safe user-facing string, or [kGenericUserError].
String userFacingApiMessage({
  int? statusCode,
  String? serverMessage,
}) {
  final safe = _sanitizeServerMessage(serverMessage);
  if (safe != null) return formatUserMessage(safe);
  return kGenericUserError;
}

String? _sanitizeServerMessage(String? raw) {
  if (raw == null || raw.trim().isEmpty) return null;
  final msg = raw.trim();
  final lower = msg.toLowerCase();

  if (_looksTechnical(msg, lower)) return null;

  // Known actionable copy from the backend.
  if (lower.contains('terms of service') || lower.contains('privacy policy')) return msg;
  if (lower.contains('code must be') || lower.contains('6 digits')) return msg;
  if (lower.contains('too many') && lower.contains('try again')) return msg;
  if (lower.contains('invalid') && (lower.contains('code') || lower.contains('otp'))) return msg;
  if (lower.contains('expired')) return msg;
  if (lower.contains('account') && lower.contains('exists')) return msg;
  if (lower.contains('not found') && lower.contains('email')) return msg;
  if (lower.contains('email') && lower.contains('not configured')) {
    return 'Email delivery is not set up on the server yet.';
  }
  if (lower.contains('temporarily unavailable') || lower.contains('try again shortly')) return msg;
  if (lower.contains('security') && lower.contains('check')) return msg;
  if (lower.contains('verification failed') && lower.contains('altcha')) {
    return 'Security check failed. Please try again.';
  }
  if (lower.contains('please upload a jpeg') ||
      lower.contains('please upload an image') ||
      lower.contains('iphone photo')) {
    return msg;
  }
  if (lower.contains('not a supported image')) return msg;
  if (lower.contains('image file is too large')) return msg;
  if (lower.contains('image resolution exceeds')) return msg;
  if (lower.contains('failed to process image')) {
    return 'Could not process that image. Try another photo.';
  }

  // Short, plain-language server messages (no jargon).
  if (msg.length <= 100 && !_looksTechnical(msg, lower)) return msg;

  return null;
}

bool _looksTechnical(String msg, String lower) {
  const blocked = [
    'http',
    'api',
    'altcha',
    'redis',
    'dart-define',
    'port=',
    '127.0.0.1',
    'localhost',
    'internal server',
    '💀',
    'token',
    'jwt',
    'oauth/exchange',
    'request failed',
    'cannot reach',
  ];
  for (final term in blocked) {
    if (lower.contains(term)) return true;
  }
  if (RegExp(r'\bHTTP\s*\d{3}\b', caseSensitive: false).hasMatch(msg)) return true;
  if (RegExp(r'\(\d{3}\)').hasMatch(msg)) return true;
  return false;
}
