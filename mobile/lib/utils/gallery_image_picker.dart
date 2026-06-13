import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import 'user_message_case.dart';

class GalleryImagePickResult {
  const GalleryImagePickResult._({this.bytes, this.fileName, this.error, this.cancelled = false});

  const GalleryImagePickResult.cancelled() : this._(cancelled: true);

  const GalleryImagePickResult.bytes(Uint8List data, {String? fileName})
      : this._(bytes: data, fileName: fileName);

  GalleryImagePickResult.error(String message) : this._(error: formatUserMessage(message));

  final Uint8List? bytes;
  final String? fileName;
  final String? error;
  final bool cancelled;
}

/// Opens the system photo picker. [image_picker] handles platform permissions.
Future<GalleryImagePickResult> pickGalleryImageBytes() async {
  try {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 92,
      requestFullMetadata: false,
    );
    if (picked == null) return const GalleryImagePickResult.cancelled();

    final bytes = await picked.readAsBytes();
    return GalleryImagePickResult.bytes(bytes, fileName: picked.name);
  } on PlatformException catch (e) {
    if (e.code == 'photo_access_denied' ||
        e.code == 'camera_access_denied' ||
        e.code == 'photo_access_restricted') {
      return GalleryImagePickResult.error(
        'Photo library access denied. Allow access in Settings and try again.',
      );
    }
    return GalleryImagePickResult.error(
      'Could not open photo library. Check permissions in Settings and try again.',
    );
  } catch (_) {
    return GalleryImagePickResult.error(
      'Could not open photo library. Check permissions in Settings and try again.',
    );
  }
}
