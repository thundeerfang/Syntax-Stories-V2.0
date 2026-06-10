import 'dart:convert';
import 'dart:isolate';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'api_errors.dart';

class AltchaChallengeV1 {
  AltchaChallengeV1({
    required this.algorithm,
    required this.challenge,
    required this.maxnumber,
    required this.salt,
    required this.signature,
  });

  factory AltchaChallengeV1.fromJson(Map<String, dynamic> json) => AltchaChallengeV1(
        algorithm: json['algorithm'] as String? ?? 'SHA-256',
        challenge: json['challenge'] as String,
        maxnumber: (json['maxnumber'] as num?)?.toInt() ?? 1000000,
        salt: json['salt'] as String,
        signature: json['signature'] as String,
      );

  final String algorithm;
  final String challenge;
  final int maxnumber;
  final String salt;
  final String signature;
}

class _SolverInput {
  _SolverInput({
    required this.algorithm,
    required this.challenge,
    required this.salt,
    required this.maxnumber,
  });

  final String algorithm;
  final String challenge;
  final String salt;
  final int maxnumber;
}

/// Brute-forces ALTCHA v1 off the UI thread (same algorithm as web widget).
int? _solveAltchaV1(_SolverInput input) {
  for (var n = 0; n <= input.maxnumber; n++) {
    final digest = _hashHex(input.algorithm, '${input.salt}$n');
    if (digest == input.challenge) return n;
  }
  return null;
}

String _hashHex(String algorithm, String data) {
  final bytes = utf8.encode(data);
  switch (algorithm.toUpperCase()) {
    case 'SHA-384':
      return sha384.convert(bytes).toString();
    case 'SHA-512':
      return sha512.convert(bytes).toString();
    default:
      return sha256.convert(bytes).toString();
  }
}

enum AltchaStatus { skipped, ok, failed }

/// Fetches and solves ALTCHA, returns base64 payload for `POST /auth/*` body.
class AltchaService {
  AltchaService({required this.baseUrl});

  final String baseUrl;

  Future<({AltchaStatus status, String? payload})> resolvePayload() async {
    final uri = Uri.parse('$baseUrl/auth/altcha/challenge');
    logApiInfo('ALTCHA: fetching challenge from $uri');
    http.Response res;
    try {
      res = await http.get(uri, headers: const {'Accept': 'application/json'});
    } catch (e, st) {
      logApiError('ALTCHA challenge fetch failed', method: 'GET', url: uri, cause: '$e\n$st');
      return (status: AltchaStatus.failed, payload: null);
    }

    if (res.statusCode == 503) {
      logApiInfo('ALTCHA: server returned 503 — verification skipped');
      return (status: AltchaStatus.skipped, payload: null);
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final hint = res.statusCode == 403 && uri.port == 5000
          ? ' (port 5000 is macOS AirPlay — API should be on :$kDefaultLocalApiPort)'
          : '';
      logApiError(
        'ALTCHA challenge HTTP error$hint',
        method: 'GET',
        url: uri,
        statusCode: res.statusCode,
        responseBody: res.body,
      );
      return (status: AltchaStatus.failed, payload: null);
    }

    AltchaChallengeV1 challenge;
    try {
      challenge = AltchaChallengeV1.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
    } catch (e, st) {
      logApiError('ALTCHA challenge parse failed', method: 'GET', url: uri, cause: '$e\n$st');
      return (status: AltchaStatus.failed, payload: null);
    }

    logApiInfo('ALTCHA: solving challenge (maxnumber=${challenge.maxnumber})…');
    final input = _SolverInput(
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      salt: challenge.salt,
      maxnumber: challenge.maxnumber,
    );

    int? number;
    final sw = Stopwatch()..start();
    try {
      number = await Isolate.run(() => _solveAltchaV1(input));
    } catch (e, st) {
      logApiError(
        'ALTCHA isolate failed — solving on main thread',
        method: 'SOLVE',
        url: uri,
        cause: '$e\n$st',
      );
      number = _solveAltchaV1(input);
    }
    logApiInfo('ALTCHA: solve finished in ${sw.elapsedMilliseconds}ms (number=$number)');

    if (number == null) {
      logApiError(
        'ALTCHA solve failed',
        method: 'SOLVE',
        url: uri,
        cause: 'No solution within maxnumber=${challenge.maxnumber}',
      );
      return (status: AltchaStatus.failed, payload: null);
    }

    final payload = {
      'algorithm': challenge.algorithm,
      'challenge': challenge.challenge,
      'number': number,
      'salt': challenge.salt,
      'signature': challenge.signature,
    };
    return (
      status: AltchaStatus.ok,
      payload: base64Encode(utf8.encode(jsonEncode(payload))),
    );
  }
}
