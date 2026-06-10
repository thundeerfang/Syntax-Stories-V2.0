import 'dart:typed_data';

import 'package:crop_your_image/crop_your_image.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/image_upload_kind.dart';
import '../../services/api_errors.dart';
import '../../services/auth_api.dart';
import '../../services/upload_api.dart';
import '../../state/auth_state.dart';
import '../../theme/app_color_tokens.dart';
import '../../utils/gallery_image_picker.dart';
import '../../utils/upload_image_alt.dart';
import '../../utils/upload_image_formats.dart';
import '../../utils/user_message_case.dart';

class ImageUploadAssetResult {
  const ImageUploadAssetResult({required this.url, this.imageAlt});

  final String url;
  final String? imageAlt;
}

/// Shared pick → crop → upload dialog for cover, avatar, and setup component images.
class ImageUploadCropDialog extends StatefulWidget {
  const ImageUploadCropDialog({super.key, required this.kind});

  final ImageUploadKind kind;

  /// Profile cover or avatar — uploads and patches the profile section.
  static Future<void> showProfile(BuildContext context, ImageUploadKind kind) async {
    assert(kind.patchesProfile);
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (_) => ImageUploadCropDialog(kind: kind),
    );
  }

  /// My Setup component image — returns the uploaded media URL.
  static Future<String?> showSetupComponent(BuildContext context) async {
    final result = await showAssetUpload(context, ImageUploadKind.setupComponent);
    return result?.url;
  }

  /// Company / school logos and work media — returns URL and optional alt from file name.
  static Future<ImageUploadAssetResult?> showAssetUpload(BuildContext context, ImageUploadKind kind) {
    assert(!kind.patchesProfile);
    return showDialog<ImageUploadAssetResult>(
      context: context,
      barrierDismissible: true,
      builder: (_) => ImageUploadCropDialog(kind: kind),
    );
  }

  @override
  State<ImageUploadCropDialog> createState() => _ImageUploadCropDialogState();
}

class _ImageUploadCropDialogState extends State<ImageUploadCropDialog> {
  final _cropController = CropController();

  Uint8List? _imageBytes;
  String? _pickedFileName;
  bool _uploading = false;
  String? _error;

  ImageUploadKind get _kind => widget.kind;

  Future<void> _pickImage() async {
    setState(() => _error = null);
    final result = await pickGalleryImageBytes();
    if (!mounted) return;
    if (result.cancelled) return;
    if (result.error != null) {
      setState(() => _error = result.error);
      return;
    }
    final bytes = result.bytes!;
    if (_kind.validatesLogoPickFormat) {
      final formatError = validateLogoUploadImage(bytes, fileName: result.fileName);
      if (formatError != null) {
        setState(() => _error = formatUserMessage(formatError));
        return;
      }
    } else if (_kind != ImageUploadKind.workMedia) {
      final formatError = validateProfileRasterUploadImage(bytes, fileName: result.fileName);
      if (formatError != null) {
        setState(() => _error = formatUserMessage(formatError));
        return;
      }
    }
    setState(() {
      _imageBytes = bytes;
      _pickedFileName = result.fileName;
    });
  }

  Future<void> _uploadCropped(Uint8List cropped) async {
    if (_kind.enforcesMaxSizeAfterCrop && cropped.length > _kind.maxSizeBytes) {
      setState(() {
        _uploading = false;
        _error = formatUserMessage('Image must be under ${_kind.maxSizeLabel}. Try a tighter crop.');
      });
      return;
    }

    setState(() {
      _uploading = true;
      _error = null;
    });

    if (_kind.patchesProfile) {
      final err = await context.read<AuthState>().uploadProfileImage(
            kind: _kind,
            imageBytes: cropped,
          );

      if (!mounted) return;
      if (err != null) {
        setState(() {
          _uploading = false;
          _error = formatUserMessage(err);
        });
        return;
      }

      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _kind.successMessage,
            style: GoogleFonts.inter(fontWeight: FontWeight.w600),
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final token = context.read<AuthState>().accessToken;
    if (token == null || token.isEmpty) {
      setState(() {
        _uploading = false;
        _error = 'Not signed in';
      });
      return;
    }

    try {
      final result = await UploadApi().uploadForKind(
        kind: _kind,
        accessToken: token,
        bytes: cropped,
      );
      if (!mounted) return;
      final imageAlt = _kind == ImageUploadKind.companyLogo ||
              _kind == ImageUploadKind.schoolLogo ||
              _kind == ImageUploadKind.orgLogo
          ? logoAltFromChosenFileName(_pickedFileName, maxLength: 120)
          : null;
      Navigator.of(context).pop(ImageUploadAssetResult(url: result.url, imageAlt: imageAlt));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploading = false;
        _error = formatUserMessage(
          e is AuthApiException ? e.message : kGenericUserError,
        );
      });
    }
  }

  void _onCropResult(CropResult result) {
    switch (result) {
      case CropSuccess(:final croppedImage):
        _uploadCropped(croppedImage);
      case CropFailure(:final cause):
        setState(() {
          _uploading = false;
          _error = formatUserMessage(cause.toString());
        });
    }
  }

  void _saveCrop() {
    if (_imageBytes == null || _uploading) return;
    setState(() {
      _uploading = true;
      _error = null;
    });
    _cropController.crop();
  }

  void _resetPick() {
    setState(() {
      _imageBytes = null;
      _pickedFileName = null;
      _error = null;
      _uploading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Dialog(
      backgroundColor: colors.card,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _kind.dialogTitle,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                            color: colors.foreground,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _kind.subtitle,
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.1,
                            color: colors.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: _uploading ? null : () => Navigator.of(context).pop(),
                    icon: Icon(Icons.close_rounded, color: colors.mutedForeground),
                    tooltip: 'Close',
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: colors.destructive.withValues(alpha: 0.08),
                    border: Border.all(color: colors.destructive.withValues(alpha: 0.45), width: 2),
                  ),
                  child: Text(
                    _error!,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: colors.destructive,
                    ),
                  ),
                ),
              ],
              if (_imageBytes == null)
                _ImageUploadPickZone(
                  onTap: _uploading ? null : _pickImage,
                  prompt: _kind.pickPrompt,
                  hint: _kind.pickHint,
                )
              else ...[
                SizedBox(
                  height: _kind.cropViewportHeight,
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: colors.border.withValues(alpha: 0.85), width: 2),
                      color: colors.muted.withValues(alpha: 0.15),
                    ),
                    child: Crop(
                      image: _imageBytes!,
                      controller: _cropController,
                      aspectRatio: _kind.aspectRatio,
                      initialRectBuilder: InitialRectBuilder.withSizeAndRatio(
                        size: 0.85,
                        aspectRatio: _kind.aspectRatio,
                      ),
                      interactive: true,
                      radius: 0,
                      baseColor: colors.muted.withValues(alpha: 0.35),
                      maskColor: Colors.black.withValues(alpha: 0.55),
                      onCropped: _onCropResult,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _uploading ? null : _resetPick,
                        child: Text(
                          'CHOOSE ANOTHER',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _uploading ? null : _saveCrop,
                        child: _uploading
                            ? SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Theme.of(context).colorScheme.onPrimary,
                                ),
                              )
                            : Text(
                                _kind.confirmLabel,
                                style: GoogleFonts.inter(fontWeight: FontWeight.w900, letterSpacing: 0.8),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ImageUploadPickZone extends StatelessWidget {
  const _ImageUploadPickZone({
    required this.onTap,
    required this.prompt,
    required this.hint,
  });

  final VoidCallback? onTap;
  final String prompt;
  final String hint;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Material(
      color: colors.muted.withValues(alpha: 0.12),
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
          decoration: BoxDecoration(
            border: Border.all(
              color: colors.border.withValues(alpha: 0.55),
              width: 2,
            ),
          ),
          child: Column(
            children: [
              Icon(Icons.photo_library_outlined, size: 32, color: colors.primary),
              const SizedBox(height: 12),
              Text(
                prompt,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.6,
                  color: colors.foreground,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                hint.toUpperCase(),
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.1,
                  color: colors.mutedForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
