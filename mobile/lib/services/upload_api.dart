import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/image_upload_kind.dart';
import 'api_errors.dart';
import 'auth_api.dart';
import 'auth_retry.dart';

class UploadResult {
  const UploadResult({
    required this.url,
    this.blurDataUrl,
    this.title,
    this.alt,
  });

  final String url;
  final String? blurDataUrl;
  final String? title;
  final String? alt;

  String? get imageAlt => (alt ?? title)?.trim().isNotEmpty == true ? (alt ?? title)!.trim() : null;
}

/// Multipart uploads — mirrors webapp `src/api/upload.ts`.
class UploadApi {
  UploadApi({String? baseUrl}) : _baseUrl = baseUrl ?? resolveApiBaseUrl();

  final String _baseUrl;

  Uri _u(String path) => Uri.parse('$_baseUrl$path');

  Future<UploadResult> uploadCover({
    required String accessToken,
    required List<int> bytes,
    String filename = 'cover.jpg',
  }) {
    return _uploadRaster(
      path: '/api/upload/cover',
      field: 'cover',
      accessToken: accessToken,
      bytes: bytes,
      filename: filename,
    );
  }

  Future<UploadResult> uploadAvatar({
    required String accessToken,
    required List<int> bytes,
    String filename = 'avatar.jpg',
  }) {
    return _uploadRaster(
      path: '/api/upload/avatar',
      field: 'avatar',
      accessToken: accessToken,
      bytes: bytes,
      filename: filename,
    );
  }

  /// `POST /api/upload/media` — setup component and profile media (cropped on client).
  Future<UploadResult> uploadMedia({
    required String accessToken,
    required List<int> bytes,
    String filename = 'component.jpg',
  }) {
    return _uploadRaster(
      path: '/api/upload/media',
      field: 'media',
      accessToken: accessToken,
      bytes: bytes,
      filename: filename,
    );
  }

  Future<UploadResult> uploadForKind({
    required ImageUploadKind kind,
    required String accessToken,
    required List<int> bytes,
    String? filename,
  }) {
    final resolved = filename?.trim().isNotEmpty == true
        ? filename!.trim()
        : kind.defaultFilename;
    return _uploadRaster(
      path: kind.uploadPath,
      field: kind.formField,
      accessToken: accessToken,
      bytes: bytes,
      filename: resolved,
    );
  }

  Future<UploadResult> _uploadRaster({
    required String path,
    required String field,
    required String accessToken,
    required List<int> bytes,
    required String filename,
  }) async {
    final uri = _u(path);
    var token = accessToken;
    final resolvedFilename = _resolveUploadFilename(bytes, filename);

    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        final request = http.MultipartRequest('POST', uri)
          ..headers['Authorization'] = 'Bearer $token'
          ..headers['Accept'] = 'application/json'
          ..files.add(
            http.MultipartFile.fromBytes(field, bytes, filename: resolvedFilename),
          );

        final streamed = await request.send();
        final body = await streamed.stream.bytesToString();

        if (streamed.statusCode == 401 && attempt == 0) {
          String? newToken;
          try {
            newToken = await AuthRetry.refreshAndGetNewToken(force: true);
          } catch (_) {
            newToken = null;
          }
          if (newToken != null && newToken.isNotEmpty) {
            token = newToken;
            continue;
          }
        }

        if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
          throw AuthApiException.fromHttp(
            method: 'POST',
            url: uri,
            statusCode: streamed.statusCode,
            body: body,
          );
        }

        final data = jsonDecode(body) as Map<String, dynamic>;
        final success = data['success'] as bool? ?? false;
        final url = data['url'] as String?;
        if (!success || url == null || url.isEmpty) {
          throw AuthApiException.internal(
            context: 'Upload response invalid',
            debugDetails: body,
            userMessage: parseServerMessage(body) ?? 'Upload failed',
          );
        }

        return UploadResult(
          url: url,
          blurDataUrl: data['blurDataUrl'] as String?,
          title: data['title'] as String?,
          alt: data['alt'] as String?,
        );
      } on AuthApiException {
        rethrow;
      } catch (e) {
        throw AuthApiException.network(method: 'POST', url: uri, cause: e);
      }
    }

    throw AuthApiException.internal(
      context: 'Upload unauthorized after token refresh',
      debugDetails: 'POST $uri',
      userMessage: 'Session expired. Please log in again.',
    );
  }
}

String _resolveUploadFilename(List<int> bytes, String filename) {
  final detected = _detectImageMime(bytes);
  if (detected == null) return filename;
  return _withImageExtension(filename, detected);
}

String? _detectImageMime(List<int> bytes) {
  if (bytes.length >= 3 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 8 &&
      bytes[0] == 0x89 &&
      bytes[1] == 0x50 &&
      bytes[2] == 0x4e &&
      bytes[3] == 0x47 &&
      bytes[4] == 0x0d &&
      bytes[5] == 0x0a &&
      bytes[6] == 0x1a &&
      bytes[7] == 0x0a) {
    return 'image/png';
  }
  if (bytes.length >= 6) {
    final sig = String.fromCharCodes(bytes.sublist(0, 6));
    if (sig == 'GIF87a' || sig == 'GIF89a') return 'image/gif';
  }
  if (bytes.length >= 12) {
    final riff = String.fromCharCodes(bytes.sublist(0, 4));
    final webp = String.fromCharCodes(bytes.sublist(8, 12));
    if (riff == 'RIFF' && webp == 'WEBP') return 'image/webp';
    final ftyp = String.fromCharCodes(bytes.sublist(4, 8));
    if (ftyp == 'ftyp') {
      final brand = String.fromCharCodes(bytes.sublist(8, 12)).toLowerCase();
      if (brand.startsWith('heic') ||
          brand.startsWith('heix') ||
          brand.startsWith('hevc') ||
          brand.startsWith('hevx') ||
          brand.startsWith('mif1') ||
          brand.startsWith('msf1')) {
        return 'image/heic';
      }
    }
  }
  return null;
}

String _withImageExtension(String filename, String mime) {
  final ext = switch (mime) {
    'image/png' => '.png',
    'image/gif' => '.gif',
    'image/webp' => '.webp',
    'image/heic' || 'image/heif' => '.heic',
    _ => '.jpg',
  };
  final dot = filename.lastIndexOf('.');
  final base = dot > 0 ? filename.substring(0, dot) : filename;
  return '$base$ext';
}
