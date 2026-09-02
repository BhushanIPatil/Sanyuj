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
import '../../widgets/common.dart';
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
      final AuthSessionResult session;
      switch (_mode) {
        case _AuthMode.login:
          session = await _api.login(email: email, password: _password.text);
        case _AuthMode.register:
          session = await _api.register(email: email, password: _password.text);
        case _AuthMode.restore:
          session = await _api.restore(email: email, password: _password.text);
      }
      await applyAuthSession(session);
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
      } else {
        setState(() => _error = e.message);
      }
    } catch (e) {
      setState(() => _error = e.toString());
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

  @override
  Widget build(BuildContext context) {
    final title = switch (_mode) {
      _AuthMode.login => 'Welcome back',
      _AuthMode.register => 'Create account',
      _AuthMode.restore => 'Restore account',
    };
    final sub = switch (_mode) {
      _AuthMode.restore => 'Set a new password to restore your deleted account.',
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
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                children: [
                  const Center(child: SanyujLogo(size: 96, plated: false)),
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(AppColors.radiusLg),
                      boxShadow: AppColors.popShadow,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(title, style: GoogleFonts.nunito(fontSize: 23, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 8),
                        Text(sub, style: const TextStyle(fontSize: 13.5, color: AppColors.inkSoft, height: 1.5)),
                        const SizedBox(height: 22),
                        const FieldLabel('Email'),
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.email],
                          autocorrect: false,
                          enableSuggestions: false,
                          readOnly: _mode == _AuthMode.restore,
                          decoration: const InputDecoration(hintText: 'you@example.com'),
                        ),
                        const SizedBox(height: 14),
                        const FieldLabel('Password'),
                        TextField(
                          controller: _password,
                          obscureText: _obscure,
                          decoration: InputDecoration(
                            hintText: '••••••••',
                            suffixIcon: IconButton(
                              onPressed: () => setState(() => _obscure = !_obscure),
                              icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                            ),
                          ),
                        ),
                        if (_mode != _AuthMode.login) ...[
                          const SizedBox(height: 14),
                          const FieldLabel('Confirm password'),
                          TextField(
                            controller: _confirm,
                            obscureText: _obscureConfirm,
                            decoration: InputDecoration(
                              hintText: '••••••••',
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
                          Text(_error!, style: const TextStyle(color: AppColors.rose, fontWeight: FontWeight.w600, fontSize: 13)),
                        ],
                        const SizedBox(height: 22),
                        PrimaryButton(
                          label: _mode == _AuthMode.login
                              ? 'Log in'
                              : _mode == _AuthMode.restore
                                  ? 'Restore account'
                                  : 'Create account',
                          loading: _loading,
                          onPressed: _submit,
                        ),
                        const SizedBox(height: 14),
                        if (_mode != _AuthMode.restore)
                          Center(
                            child: TextButton(
                              onPressed: () => setState(() {
                                _mode = _mode == _AuthMode.login ? _AuthMode.register : _AuthMode.login;
                                _error = null;
                              }),
                              child: Text(
                                _mode == _AuthMode.login
                                    ? 'New here? Create an account'
                                    : 'Already have an account? Log in',
                                style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                              ),
                            ),
                          ),
                        Center(
                          child: TextButton(
                            onPressed: _continueAsGuest,
                            child: const Text(
                              'Continue as guest',
                              style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.inkSoft),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          alignment: WrapAlignment.center,
                          children: [
                            const Text('By continuing you agree to Sanyuj\'s ', style: TextStyle(fontSize: 12, color: AppColors.inkFaint)),
                            GestureDetector(
                              onTap: () => launchUrl(Uri.parse(AppConfig.termsUrl)),
                              child: const Text('Terms', style: TextStyle(fontSize: 12, color: AppColors.blueDeep, fontWeight: FontWeight.w700)),
                            ),
                            const Text(' & ', style: TextStyle(fontSize: 12, color: AppColors.inkFaint)),
                            GestureDetector(
                              onTap: () => launchUrl(Uri.parse(AppConfig.privacyUrl)),
                              child: const Text('Privacy Policy', style: TextStyle(fontSize: 12, color: AppColors.blueDeep, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                      ],
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
