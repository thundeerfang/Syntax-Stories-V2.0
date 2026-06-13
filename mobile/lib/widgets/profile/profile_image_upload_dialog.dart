import 'package:flutter/material.dart';

import '../../models/image_upload_kind.dart';
import '../ui/image_upload_crop_dialog.dart';

/// @deprecated Use [ImageUploadCropDialog.showProfile].
class ProfileImageUploadDialog {
  ProfileImageUploadDialog._();

  static Future<void> show(BuildContext context, ImageUploadKind kind) {
    return ImageUploadCropDialog.showProfile(context, kind);
  }
}
