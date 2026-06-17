import 'dart:typed_data';

// Keep in sync with webapp/packages/shared/uploadValidation.ts

const logoUploadRejectMessage =
    'Please upload a JPEG, PNG, WebP, or iPhone photo (HEIC).';

const profileRasterUploadRejectMessage =
    'Please upload a JPEG, PNG, GIF, WebP, or iPhone photo (HEIC).';

const feedbackUploadRejectMessage = 'Use a JPEG, PNG, GIF, or WebP image.';

enum ImageClientValidationProfile { raster, logo, feedback }

/// Magic-byte MIME sniffing — shared with server uploadValidation.
String? detectImageMimeFromBytes(Uint8List bytes) {
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

bool isSvgUpload(Uint8List bytes, {String? fileName}) {
  final name = fileName?.trim().toLowerCase() ?? '';
  if (name.endsWith('.svg')) return true;
  if (bytes.isEmpty) return false;
  final sampleLen = bytes.length < 512 ? bytes.length : 512;
  final head = String.fromCharCodes(bytes.sublist(0, sampleLen)).trimLeft().toLowerCase();
  return head.startsWith('<svg') || head.contains('<svg');
}

bool _isHeicFileName(String? fileName) {
  final name = fileName?.trim().toLowerCase() ?? '';
  return name.endsWith('.heic') || name.endsWith('.heif');
}

bool _isAllowedLogoMime(String? mime) {
  return mime == 'image/jpeg' ||
      mime == 'image/png' ||
      mime == 'image/webp' ||
      mime == 'image/heic' ||
      mime == 'image/heif';
}

bool _isAllowedProfileRasterMime(String? mime) {
  return _isAllowedLogoMime(mime) || mime == 'image/gif';
}

String _rejectMessageForProfile(ImageClientValidationProfile profile) {
  return switch (profile) {
    ImageClientValidationProfile.logo => logoUploadRejectMessage,
    ImageClientValidationProfile.feedback => feedbackUploadRejectMessage,
    ImageClientValidationProfile.raster => profileRasterUploadRejectMessage,
  };
}

bool _isAllowedMimeForProfile(String? mime, ImageClientValidationProfile profile) {
  return switch (profile) {
    ImageClientValidationProfile.logo => _isAllowedLogoMime(mime),
    ImageClientValidationProfile.feedback => _isAllowedProfileRasterMime(mime),
    ImageClientValidationProfile.raster => _isAllowedProfileRasterMime(mime),
  };
}

/// Returns a user-facing error, or null when the pick is allowed.
String? validateImageBytesClient(
  Uint8List bytes, {
  required ImageClientValidationProfile profile,
  String? fileName,
}) {
  final reject = _rejectMessageForProfile(profile);
  if (isSvgUpload(bytes, fileName: fileName)) {
    return 'SVG files are not supported. $reject';
  }
  final mime = detectImageMimeFromBytes(bytes);
  if (mime != null) {
    return _isAllowedMimeForProfile(mime, profile) ? null : reject;
  }
  if (profile == ImageClientValidationProfile.logo ||
      profile == ImageClientValidationProfile.raster) {
    return _isHeicFileName(fileName) ? null : reject;
  }
  return reject;
}

/// Returns a user-facing error, or null when the pick is allowed.
String? validateLogoUploadImage(Uint8List bytes, {String? fileName}) {
  return validateImageBytesClient(
    bytes,
    profile: ImageClientValidationProfile.logo,
    fileName: fileName,
  );
}

/// Returns a user-facing error, or null when the pick is allowed.
String? validateProfileRasterUploadImage(Uint8List bytes, {String? fileName}) {
  return validateImageBytesClient(
    bytes,
    profile: ImageClientValidationProfile.raster,
    fileName: fileName,
  );
}
