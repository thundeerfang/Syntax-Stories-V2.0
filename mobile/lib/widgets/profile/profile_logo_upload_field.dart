import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/image_upload_kind.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/resolve_profile_media_url.dart';
import '../ui/dashed_border_box.dart';
import '../ui/image_upload_crop_dialog.dart';

/// Square logo upload — company or school logos via shared crop dialog.
class ProfileLogoUploadField extends StatelessWidget {
  const ProfileLogoUploadField({
    super.key,
    required this.label,
    required this.kind,
    required this.logoUrl,
    required this.disabled,
    required this.onUploaded,
    this.hint,
  });

  final String label;
  final ImageUploadKind kind;
  final String logoUrl;
  final bool disabled;
  final ValueChanged<ImageUploadAssetResult> onUploaded;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final preview = resolveProfileMediaUrl(logoUrl);
    final helper = hint ?? '${kind.subtitle}. Alt text from file name.';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
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
          padding: EdgeInsets.all(preview.isNotEmpty ? 16 : 20),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: disabled
                  ? null
                  : () async {
                      final result = await ImageUploadCropDialog.showAssetUpload(context, kind);
                      if (result != null && result.url.isNotEmpty) onUploaded(result);
                    },
              child: preview.isNotEmpty
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: context.appColors.border.withValues(alpha: 0.85),
                              width: 2,
                            ),
                            color: context.appColors.card,
                          ),
                          clipBehavior: Clip.hardEdge,
                          child: Image.network(
                            preview,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Icon(
                              Icons.business_outlined,
                              color: context.appColors.mutedForeground,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'TAP TO REPLACE LOGO',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.8,
                                  color: disabled
                                      ? context.appColors.mutedForeground.withValues(alpha: 0.5)
                                      : context.appColors.foreground,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                helper,
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
                      ],
                    )
                  : Column(
                      children: [
                        Icon(
                          Icons.add_photo_alternate_outlined,
                          size: 36,
                          color: context.appColors.primary,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'TAP TO UPLOAD LOGO',
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
                          helper,
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
