import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../utils/errors.dart';
import '../theme/app_theme.dart';
import 'common.dart';

Future<bool?> showChangePasswordDialog(
  BuildContext context, {
  required String email,
}) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => _ChangePasswordDialog(email: email),
  );
}

class _ChangePasswordDialog extends StatefulWidget {
  const _ChangePasswordDialog({required this.email});

  final String email;

  @override
  State<_ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends State<_ChangePasswordDialog> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _obscureCurrent = true;
  bool _obscureNext = true;
  bool _obscureConfirm = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  InputDecoration _decoration(String hint, {required bool obscure, required VoidCallback onToggle}) {
    return InputDecoration(
      hintText: hint,
      suffixIcon: IconButton(
        onPressed: onToggle,
        icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
      ),
    );
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final current = _current.text;
      final next = _next.text;
      final confirm = _confirm.text;
      if (current.isEmpty || next.isEmpty || confirm.isEmpty) {
        throw Exception('Fill in all password fields');
      }
      if (next.length < 6) {
        throw Exception('New password must be at least 6 characters');
      }
      if (next != confirm) {
        throw Exception('New passwords do not match');
      }
      if (current == next) {
        throw Exception('New password must be different from current password');
      }

      final auth = Supabase.instance.client.auth;
      final signIn = await auth.signInWithPassword(email: widget.email, password: current);
      if (signIn.user == null) {
        throw Exception('Current password is incorrect');
      }
      await auth.updateUser(UserAttributes(password: next));
      if (!mounted) return;
      Navigator.pop(context, true);
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.bgApp,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusLg)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(22, 24, 22, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Change password', style: GoogleFonts.nunito(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text(
              'Enter your current password and choose a new one.',
              style: TextStyle(fontSize: 13, color: AppColors.inkSoft, height: 1.4),
            ),
            const SizedBox(height: 18),
            const FieldLabel('Current password'),
            TextField(
              controller: _current,
              obscureText: _obscureCurrent,
              decoration: _decoration(
                '••••••••',
                obscure: _obscureCurrent,
                onToggle: () => setState(() => _obscureCurrent = !_obscureCurrent),
              ),
            ),
            const SizedBox(height: 12),
            const FieldLabel('New password'),
            TextField(
              controller: _next,
              obscureText: _obscureNext,
              decoration: _decoration(
                '••••••••',
                obscure: _obscureNext,
                onToggle: () => setState(() => _obscureNext = !_obscureNext),
              ),
            ),
            const SizedBox(height: 12),
            const FieldLabel('Confirm new password'),
            TextField(
              controller: _confirm,
              obscureText: _obscureConfirm,
              decoration: _decoration(
                '••••••••',
                obscure: _obscureConfirm,
                onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.rose, fontWeight: FontWeight.w600, fontSize: 13)),
            ],
            const SizedBox(height: 20),
            PrimaryButton(label: 'Change password', loading: _loading, onPressed: _submit),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _loading ? null : () => Navigator.pop(context, false),
              child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.inkSoft)),
            ),
          ],
        ),
      ),
    );
  }
}
