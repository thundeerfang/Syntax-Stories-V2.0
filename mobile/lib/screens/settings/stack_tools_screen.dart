import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../state/auth_state.dart';
import '../../utils/stack_tools_limits.dart';
import '../../utils/user_message_case.dart';
import '../../widgets/settings/settings_empty_inventory.dart';
import '../../widgets/settings/settings_inventory_header.dart';
import '../../widgets/settings/settings_save_reset_row.dart';
import '../../widgets/settings/settings_section_scaffold.dart';
import '../../widgets/stack_tools/stack_tool_badge.dart';
import '../../widgets/stack_tools/stack_tools_search_field.dart';
import '../../widgets/ui/app_confirm_dialog.dart';
import '../../widgets/ui/app_feedback_toast.dart';

class StackToolsScreen extends StatefulWidget {
  const StackToolsScreen({super.key});

  @override
  State<StackToolsScreen> createState() => _StackToolsScreenState();
}

class _StackToolsScreenState extends State<StackToolsScreen> {
  static const _saveSuccessMessage = 'Stack & tools saved.';

  List<String> _items = [];
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _applyFromUser(context.read<AuthState>().user?.stackAndTools);
  }

  void _applyFromUser(List<String>? stack) {
    _items = (stack ?? []).take(stackAndToolsMax).toList();
  }

  List<String> get _baseline =>
      (context.read<AuthState>().user?.stackAndTools ?? []).take(stackAndToolsMax).toList();

  bool get _dirty {
    if (_items.length != _baseline.length) return true;
    for (var i = 0; i < _items.length; i++) {
      if (_items[i] != _baseline[i]) return true;
    }
    return false;
  }

  void _addItem(String name) {
    if (_items.length >= stackAndToolsMax) {
      AppFeedbackToast.error(
        context,
        'You can add up to $stackAndToolsMax languages and tools.',
      );
      return;
    }
    if (_items.contains(name)) return;
    setState(() => _items = [..._items, name]);
  }

  Future<void> _confirmRemove(int index) async {
    final name = _items[index];
    final confirmed = await AppConfirmDialog.show(
      context,
      title: 'Remove module?',
      message: 'Are you sure you want to remove $name from your stack & tools?',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
    );
    if (confirmed != true || !mounted) return;
    setState(() => _items = List<String>.from(_items)..removeAt(index));
  }

  Future<void> _save() async {
    if (!_dirty) {
      AppFeedbackToast.warning(context, 'No changes to save.');
      return;
    }
    setState(() => _saving = true);

    final err = await context.read<AuthState>().updateProfileSection('stack', {
      'stackAndTools': _items.take(stackAndToolsMax).toList(),
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
    setState(() => _applyFromUser(context.read<AuthState>().user?.stackAndTools));
  }

  Future<void> _pullRefresh() async {
    await context.read<AuthState>().refreshUser();
    if (!mounted) return;
    setState(() => _applyFromUser(context.read<AuthState>().user?.stackAndTools));
  }

  @override
  Widget build(BuildContext context) {
    context.watch<AuthState>();

    return SettingsSectionScaffold(
      title: 'Stack & Tools',
      description: 'Search and add up to $stackAndToolsMax\nlanguages, frameworks, and tools.',
      icon: Icons.memory_outlined,
      iconOnPrimary: true,
      headerStyle: SettingsSectionHeaderStyle.centeredPlain,
      showHeaderTitle: false,
      onRefresh: _pullRefresh,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SettingsInventoryHeader(
            title: 'ACTIVE MODULES',
            count: _items.length,
            max: stackAndToolsMax,
          ),
          const SizedBox(height: 10),
          if (_items.isEmpty)
            const SettingsEmptyInventory(
              icon: Icons.search_off_rounded,
              message: 'NO MODULES INITIALIZED. USE THE SEARCH BELOW.',
            )
          else
            StackToolsBadgeList(
              names: _items,
              onRemoveAt: _confirmRemove,
            ),
          const SizedBox(height: 24),
          StackToolsSearchField(
            disabled: _items.length >= stackAndToolsMax,
            existingItems: _items,
            onAdd: _addItem,
          ),
          const SizedBox(height: 20),
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
