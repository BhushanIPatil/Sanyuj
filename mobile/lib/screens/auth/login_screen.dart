import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/app_config.dart';
import '../../providers.dart';
import '../../services/auth_api.dart';
import '../../services/guest.dart';
import '../../theme/app_theme.dart';
import '../../utils/errors.dart';
import '../../widgets/sanyuj_logo.dart';

enum _AuthMode { login, register, restore }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, this.next});

  final String? next;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _api = AuthApi();
  _AuthMode _mode = _AuthMode.login;
  bool _loading = false;
  bool _obscure = true;
  bool _obscureConfirm = true;
  String? _error;
  String? _pendingEmail;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final email = _email.text.trim().toLowerCase();
      if (email.isEmpty || !email.contains('@') || !email.contains('.')) {
        throw AuthApiException('Enter a valid email address');
      }
      if ((_mode == _AuthMode.register || _mode == _AuthMode.restore) &&
          _password.text != _confirm.text) {
        throw AuthApiException('Passwords do not match');
      }
      if (_mode == _AuthMode.register && _password.text.length < 6) {
        throw AuthApiException('Password must be at least 6 characters');
      }

      if (_mode == _AuthMode.register) {
        final result = await _api.register(email: email, password: _password.text);
        if (result.confirmationSent) {
          if (!mounted) return;
          setState(() {
            _pendingEmail = result.email ?? email;
            _mode = _AuthMode.login;
            _error = null;
          });
          return;
        }
        final session = result.session;
        if (session == null) throw AuthApiException('Could not create account');
        await applyAuthSession(session);
      } else {
        final session = _mode == _AuthMode.login
            ? await _api.login(email: email, password: _password.text)
            : await _api.restore(email: email, password: _password.text);
        await applyAuthSession(session);
      }
      if (!mounted) return;
      final profile = await ref.read(repoProvider).fetchProfile();
      if (!mounted) return;
      final next = widget.next;
      if (profile?.onboardingComplete == true && next != null && next.startsWith('/')) {
        context.go(next);
      } else {
        context.go(profile?.onboardingComplete == true ? '/home' : '/onboarding');
      }
    } on AuthApiException catch (e) {
      if (e.restoreAvailable) {
        setState(() {
          _mode = _AuthMode.restore;
          _error = e.message;
        });
      } else if (e.statusCode == 403 && e.message.toLowerCase().contains('confirm')) {
        setState(() {
          _pendingEmail = _email.text.trim().toLowerCase();
          _error = e.message;
        });
      } else {
        setState(() => _error = e.message);
      }
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resendConfirmation() async {
    final email = _pendingEmail;
    if (email == null || _loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _api.resendSignupEmail(email);
      if (!mounted) return;
      setState(() => _error = 'Confirmation email sent again.');
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _continueAsGuest() async {
    await GuestSession.instance.enter();
    if (!mounted) return;
    final next = widget.next;
    const gated = {'/post-job', '/profile/edit', '/business/setup'};
    if (next != null && next.startsWith('/') && !gated.contains(next)) {
      context.go(next);
    } else {
      context.go('/home');
    }
  }

  InputDecoration _fieldDecoration(String hint, {Widget? suffixIcon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.45)),
      filled: true,
      fillColor: Colors.white.withValues(alpha: 0.14),
      suffixIcon: suffixIcon,
      suffixIconColor: Colors.white.withValues(alpha: 0.75),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppColors.radiusMd),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.28)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppColors.radiusMd),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.28)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppColors.radiusMd),
        borderSide: const BorderSide(color: Colors.white, width: 1.5),
      ),
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: Colors.white.withValues(alpha: 0.9),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = switch (_mode) {
      _AuthMode.login => _pendingEmail != null ? 'Check your email' : 'Welcome back',
      _AuthMode.register => _pendingEmail != null ? 'Check your email' : 'Create account',
      _AuthMode.restore => 'Restore account',
    };
    final sub = switch (_mode) {
      _AuthMode.restore => 'Set a new password to restore your deleted account.',
      _ when _pendingEmail != null =>
        'We sent a confirmation link to $_pendingEmail. Open it to authorize this account, then log in.',
      _AuthMode.login => 'Use your email and password to continue.',
      _AuthMode.register => 'One account for everything — find help or list your business.',
    };

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppColors.logoGradient),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
                children: [
                  const Center(child: SanyujTransparentLogo(size: 128)),
                  const SizedBox(height: 20),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.nunito(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    sub,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13.5,
                      color: Colors.white.withValues(alpha: 0.82),
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 28),
                  _label('Email'),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                    autocorrect: false,
                    enableSuggestions: false,
                    readOnly: _mode == _AuthMode.restore,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                    cursorColor: Colors.white,
                    decoration: _fieldDecoration('you@example.com'),
                  ),
                  const SizedBox(height: 14),
                  _label('Password'),
                  TextField(
                    controller: _password,
                    obscureText: _obscure,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                    cursorColor: Colors.white,
                    decoration: _fieldDecoration(
                      '••••••••',
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                      ),
                    ),
                  ),
                  if (_mode != _AuthMode.login) ...[
                    const SizedBox(height: 14),
                    _label('Confirm password'),
                    TextField(
                      controller: _confirm,
                      obscureText: _obscureConfirm,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                      cursorColor: Colors.white,
                      decoration: _fieldDecoration(
                        '••••••••',
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                          icon: Icon(
                            _obscureConfirm
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: const TextStyle(color: Color(0xFFFFD4D6), fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton(
                      onPressed: _loading ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.blueDeep,
                        disabledBackgroundColor: Colors.white.withValues(alpha: 0.7),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                        textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 15),
                      ),
                      child: _loading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.blueDeep),
                            )
                          : Text(
                              _mode == _AuthMode.login
                                  ? 'Log in'
                                  : _mode == _AuthMode.restore
                                      ? 'Restore account'
                                      : 'Create account',
                            ),
                    ),
                  ),
                  if (_pendingEmail != null) ...[
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton(
                        onPressed: _loading ? null : _resendConfirmation,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: BorderSide(color: Colors.white.withValues(alpha: 0.5), width: 1.5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                          textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                        child: const Text('Resend confirmation email'),
                      ),
                    ),
                    Center(
                      child: TextButton(
                        onPressed: _loading
                            ? null
                            : () => setState(() {
                                  _mode = _AuthMode.login;
                                  _pendingEmail = null;
                                  _error = null;
                                }),
                        child: Text(
                          "I've confirmed — log in",
                          style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  if (_mode != _AuthMode.restore)
                    Center(
                      child: TextButton(
                        onPressed: () => setState(() {
                          _mode = _mode == _AuthMode.login ? _AuthMode.register : _AuthMode.login;
                          _error = null;
                          _pendingEmail = null;
                        }),
                        child: Text(
                          _mode == _AuthMode.login
                              ? 'New here? Create an account'
                              : 'Already have an account? Log in',
                          style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                    ),
                  Center(
                    child: TextButton(
                      onPressed: _continueAsGuest,
                      child: Text(
                        'Continue as guest',
                        style: GoogleFonts.nunito(
                          fontWeight: FontWeight.w700,
                          color: Colors.white.withValues(alpha: 0.82),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    alignment: WrapAlignment.center,
                    children: [
                      Text(
                        'By continuing you agree to Sanyuj\'s ',
                        style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.7)),
                      ),
                      GestureDetector(
                        onTap: () => launchUrl(Uri.parse(AppConfig.termsUrl)),
                        child: const Text(
                          'Terms',
                          style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w700),
                        ),
                      ),
                      Text(' & ', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.7))),
                      GestureDetector(
                        onTap: () => launchUrl(Uri.parse(AppConfig.privacyUrl)),
                        child: const Text(
                          'Privacy Policy',
                          style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),
                  Text(
                    'App Version: ${AppConfig.appVersion}',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.white.withValues(alpha: 0.55),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
