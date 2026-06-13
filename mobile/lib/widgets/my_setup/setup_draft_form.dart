import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/my_setup_limits.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../../widgets/auth/auth_text_field.dart';
import '../../widgets/ui/dashed_border_box.dart';
import '../../widgets/ui/image_upload_crop_dialog.dart';

/// Label, source link, and image upload fields for the component editor screen.
class SetupDraftForm extends StatelessWidget {
  const SetupDraftForm({
    super.key,
    required this.labelController,
    required this.productUrlController,
    required this.imageUrl,
    required this.disabled,
    required this.onPickImage,
    this.onChanged,
  });

  final TextEditingController labelController;
  final TextEditingController productUrlController;
  final String imageUrl;
  final bool disabled;
  final ValueChanged<ImageUploadAssetResult> onPickImage;
  final VoidCallback? onChanged;

  @override
  Widget build(BuildContext context) {
    final previewUrl = resolveProfileMediaUrl(imageUrl);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AuthTextField(
          controller: labelController,
          label: 'LABEL',
          hintText: 'e.g. LG UltraWide 34"',
          maxLength: setupLabelMax,
          enabled: !disabled,
          showCounter: false,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 16),
        AuthTextField(
          controller: productUrlController,
          label: 'SOURCE LINK',
          hintText: 'https://amazon.com/...',
          maxLength: setupUrlMax,
          keyboardType: TextInputType.url,
          autocorrect: false,
          enabled: !disabled,
          showCounter: false,
          onChanged: (_) => onChanged?.call(),
        ),
        const SizedBox(height: 20),
        Text(
          'UPLOAD COMPONENT IMAGE',
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: context.appColors.mutedForeground,
          ),
        ),
        const SizedBox(height: 8),
        DashedBorderBox(
          color: context.appColors.border.withValues(alpha: 0.85),
          backgroundColor: context.appColors.muted.withValues(alpha: 0.08),
          padding: const EdgeInsets.all(20),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: disabled
                  ? null
                  : () async {
                      final result = await ImageUploadCropDialog.showSetupComponent(context);
                      if (result != null && result.url.isNotEmpty) {
                        onPickImage(result);
                        onChanged?.call();
                      }
                    },
              child: Column(
                children: [
                  if (previewUrl.isNotEmpty) ...[
                    AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: context.appColors.border.withValues(alpha: 0.85),
                            width: 2,
                          ),
                        ),
                        clipBehavior: Clip.hardEdge,
                        child: Image.network(
                          previewUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Center(
                            child: Icon(
                              Icons.broken_image_outlined,
                              color: context.appColors.mutedForeground,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ] else ...[
                    Icon(
                      Icons.add_photo_alternate_outlined,
                      size: 36,
                      color: context.appColors.primary,
                    ),
                    const SizedBox(height: 12),
                  ],
                  Text(
                    previewUrl.isEmpty ? 'TAP TO UPLOAD IMAGE' : 'TAP TO REPLACE IMAGE',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                      color: disabled
                          ? context.appColors.mutedForeground.withValues(alpha: 0.5)
                          : context.appColors.foreground,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '16∶9 crop · JPEG, PNG, WebP, or iPhone photo (HEIC) · max 5 MB. '
                    'Shows on your profile setup grid.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      height: 1.45,
                      fontWeight: FontWeight.w500,
                      color: context.appColors.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
