import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SettingsSaveResetRow extends StatelessWidget {
  const SettingsSaveResetRow({
    super.key,
    required this.saving,
    required this.onReset,
    required this.onSave,
    this.saveLabel = 'SAVE CHANGES',
  });

  final bool saving;
  final VoidCallback onReset;
  final VoidCallback onSave;
  final String saveLabel;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: saving ? null : onReset,
            child: Text(
              'RESET',
              style: GoogleFonts.inter(fontWeight: FontWeight.w900, letterSpacing: 0.8),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton(
            onPressed: saving ? null : onSave,
            child: saving
                ? SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Theme.of(context).colorScheme.onPrimary,
                    ),
                  )
                : Text(
                    saveLabel,
                    style: GoogleFonts.inter(fontWeight: FontWeight.w900, letterSpacing: 0.8),
                  ),
          ),
        ),
      ],
    );
  }
}
