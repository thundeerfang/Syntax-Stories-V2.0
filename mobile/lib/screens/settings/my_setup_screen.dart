import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/setup_item.dart';
import '../../state/auth_state.dart';
import '../../utils/my_setup_limits.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/my_setup/setup_component_badge.dart';
import '../../widgets/settings/settings_empty_inventory.dart';
import '../../widgets/settings/settings_inventory_header.dart';
import '../../widgets/settings/settings_save_reset_row.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/ui/app_confirm_dialog.dart';
import '../../widgets/ui/app_feedback_toast.dart';
import 'my_setup_component_editor_screen.dart';

class MySetupScreen extends StatefulWidget {
  const MySetupScreen({super.key});

  @override
  State<MySetupScreen> createState() => _MySetupScreenState();
}

class _MySetupScreenState extends State<MySetupScreen> {
  static const _saveSuccessMessage = 'My setup saved.';

  List<SetupItem> _items = [];
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _applyFromUser(context.read<AuthState>().user?.mySetup);
  }

  void _applyFromUser(List<SetupItem>? setup) {
    _items = (setup ?? []).take(mySetupMax).toList();
  }

  List<SetupItem> get _baseline =>
      (context.read<AuthState>().user?.mySetup ?? []).take(mySetupMax).toList();

  bool get _dirty {
    if (_items.length != _baseline.length) return true;
    for (var i = 0; i < _items.length; i++) {
      if (_items[i] != _baseline[i]) return true;
    }
    return false;
  }

  bool get _atMax => _items.length >= mySetupMax;

  Future<void> _openAddComponent() async {
    if (_atMax) {
      AppFeedbackToast.error(
        context,
        'You can add up to $mySetupMax setup components.',
      );
      return;
    }

    final item = await MySetupComponentEditorScreen.open(context);
    if (item == null || !mounted) return;
    setState(() => _items = [..._items, item].take(mySetupMax).toList());
  }

  Future<void> _openEditComponent(int index) async {
    final item = await MySetupComponentEditorScreen.open(
      context,
      initialItem: _items[index],
    );
    if (item == null || !mounted) return;
    setState(() => _items = List<SetupItem>.from(_items)..[index] = item);
  }

  Future<void> _confirmRemove(int index) async {
    final name = _items[index].label;
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Remove component?',
      message: 'Are you sure you want to remove $name from your setup?',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
    );
    if (confirmed != true || !mounted) return;
    setState(() => _items = List<SetupItem>.from(_items)..removeAt(index));
  }

  Future<void> _save() async {
    if (!_dirty) {
      AppFeedbackToast.warning(context, 'No changes to save.');
      return;
    }
    setState(() => _saving = true);

    final payload = _items.take(mySetupMax).map((e) => e.toJson()).toList();
    final err = await context.read<AuthState>().updateProfileSection('setup', {
      'mySetup': payload,
    });

    if (!mounted) return;
    setState(() => _saving = false);
    if (err == null) {
      AppFeedbackToast.success(context, _saveSuccessMessage);
    } else {
      AppFeedbackToast.error(context, formatUserMessage(err));
    }
  }

  Future<void> _reset() async {
    await context.read<AuthState>().refreshUser();
    if (!mounted) return;
    setState(() => _applyFromUser(context.read<AuthState>().user?.mySetup));
  }

  Future<void> _pullRefresh() async {
    await context.read<AuthState>().refreshUser();
    if (!mounted) return;
    setState(() => _applyFromUser(context.read<AuthState>().user?.mySetup));
  }

  @override
  Widget build(BuildContext context) {
    context.watch<AuthState>();
    final hasItems = _items.isNotEmpty;

    return SettingsSectionScaffold(
      title: 'My Setup',
      description: 'Configure up to $mySetupMax\nworkstation components and gear.',
      icon: Icons.build_outlined,
      iconOnPrimary: true,
      headerStyle: SettingsSectionHeaderStyle.centeredPlain,
      showHeaderTitle: false,
      onRefresh: _pullRefresh,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SettingsInventoryHeader(
            title: 'ACTIVE COMPONENTS',
            count: _items.length,
            max: mySetupMax,
            onAdd: hasItems && !_atMax ? _openAddComponent : null,
          ),
          const SizedBox(height: 10),
          if (!hasItems)
            SettingsEmptyInventory(
              icon: Icons.desktop_windows_outlined,
              message: 'NO COMPONENTS INITIALIZED.',
              action: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _atMax ? null : _openAddComponent,
                  child: Text(
                    'ADD NEW COMPONENT',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w900, letterSpacing: 0.8),
                  ),
                ),
              ),
            )
          else
            SetupComponentBadgeList(
              items: _items,
              onRemoveAt: _confirmRemove,
              onEditAt: _openEditComponent,
            ),
          const SizedBox(height: 24),
          SettingsSaveResetRow(
            saving: _saving,
            onReset: _reset,
            onSave: _save,
          ),
        ],
      ),
    );
  }
}
