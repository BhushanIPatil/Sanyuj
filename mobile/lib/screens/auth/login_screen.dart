import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

enum _AuthMode { login, register, restore, forgot }
enum _AuthStep { form, otp, newPassword }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, this.next});

  final String? next;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  static const _spamTip =
      "If you don't see the email, check Spam / Junk (and Promotions). The code expires after a short time.";

  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _otp = TextEditingController();
  final _api = AuthApi();

  _AuthMode _mode = _AuthMode.login;
  _AuthStep _step = _AuthStep.form;
  String _otpPurpose = 'signup';
  AuthSessionResult? _resetSession;
  bool _loading = false;
  bool _obscure = true;
  bool _obscureConfirm = true;
  String? _error;
  String? _info;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    _otp.dispose();
    super.dispose();
  }

  void _resetTo(_AuthMode mode) {
    setState(() {
      _mode = mode;
      _step = _AuthStep.form;
      _otpPurpose = 'signup';
      _resetSession = null;
      _otp.clear();
      _password.clear();
      _confirm.clear();
      _obscure = true;
      _obscureConfirm = true;
      _error = null;
      _info = null;
    });
  }

  void _enterOtp(String purpose, String email) {
    setState(() {
      _email.text = email;
      _otpPurpose = purpose;
      _otp.clear();
      _step = _AuthStep.otp;
      _error = null;
      _info = 'We sent a 6-digit code to $email. $_spamTip';
    });
  }

  Future<void> _goAfterAuth() async {
    if (!mounted) return;
    final profile = await ref.read(repoProvider).fetchProfile();
    if (!mounted) return;
    final next = widget.next;
    if (profile?.onboardingComplete == true && next != null && next.startsWith('/')) {
      context.go(next);
    } else {
      context.go(profile?.onboardingComplete == true ? '/home' : '/onboarding');
    }
  }

  Future<void> _submitForm() async {
    setState(() {
      _error = null;
      _info = null;
      _loading = true;
    });
    try {
      final email = _email.text.trim().toLowerCase();
      if (email.isEmpty || !email.contains('@') || !email.contains('.')) {
        throw AuthApiException('Enter a valid email address');
      }

      if (_mode == _AuthMode.forgot) {
        await _api.sendOtp(email: email, purpose: 'reset');
        if (!mounted) return;
        _enterOtp('reset', email);
        return;
      }

      if ((_mode == _AuthMode.register || _mode == _AuthMode.restore) &&
          _password.text != _confirm.text) {
        throw AuthApiException('Passwords do not match');
      }
      if ((_mode == _AuthMode.register || _mode == _AuthMode.restore) &&
          _password.text.length < 6) {
        throw AuthApiException('Password must be at least 6 characters');
      }

      if (_mode == _AuthMode.register) {
        final result = await _api.register(email: email, password: _password.text);
        if (result.otpSent) {
          if (!mounted) return;
          _enterOtp(result.purpose ?? 'signup', result.email ?? email);
          return;
        }
        final session = result.session;
        if (session == null) throw AuthApiException('Could not create account');
        await applyAuthSession(session);
        await _goAfterAuth();
        return;
      }

      if (_mode == _AuthMode.restore) {
        final result = await _api.restore(email: email, password: _password.text);
        if (result.otpSent) {
          if (!mounted) return;
          _enterOtp(result.purpose ?? 'restore', result.email ?? email);
          return;
        }
        final session = result.session;
        if (session == null) throw AuthApiException('Could not restore account');
        await applyAuthSession(session);
        await _goAfterAuth();
        return;
      }

      final session = await _api.login(email: email, password: _password.text);
      await applyAuthSession(session);
      await _goAfterAuth();
    } on AuthApiException catch (e) {
      if (e.restoreAvailable) {
        setState(() {
          _mode = _AuthMode.restore;
          _step = _AuthStep.form;
          _password.clear();
          _confirm.clear();
          _error = null;
          _info =
              'An account already exists with this email. Set a new password and verify the code we send to your email.';
        });
      } else if (e.otpRequired) {
        final email = e.email ?? _email.text.trim().toLowerCase();
        try {
          await _api.sendOtp(email: email, purpose: 'signup');
        } catch (_) {}
        if (!mounted) return;
        _enterOtp('signup', email);
      } else {
        setState(() => _error = e.message);
      }
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitOtp() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final email = _email.text.trim().toLowerCase();
      final token = _otp.text.trim();
      if (!RegExp(r'^\d{6}$').hasMatch(token)) {
        throw AuthApiException('Enter the 6-digit code from your email');
      }

      final session = await _api.verifyOtp(
        email: email,
        token: token,
        purpose: _otpPurpose,
        password: _otpPurpose == 'restore' ? _password.text : null,
      );

      if (_otpPurpose == 'reset') {
        if (!mounted) return;
        setState(() {
          _resetSession = session;
          _password.clear();
          _confirm.clear();
          _obscure = true;
          _obscureConfirm = true;
          _step = _AuthStep.newPassword;
          _info = 'Code verified. Choose a new password to finish.';
          _error = null;
        });
        return;
      }

      await applyAuthSession(session);
      await _goAfterAuth();
    } on AuthApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitNewPassword() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      if (_password.text.length < 6) {
        throw AuthApiException('Password must be at least 6 characters');
      }
      if (_password.text != _confirm.text) {
        throw AuthApiException('Passwords do not match');
      }
      final reset = _resetSession;
      if (reset == null) {
        throw AuthApiException('Verify the email code before setting a new password');
      }

      await _api.setPassword(
        email: _email.text.trim().toLowerCase(),
        password: _password.text,
        accessToken: reset.accessToken,
        refreshToken: reset.refreshToken,
      );

      if (!mounted) return;
      _resetTo(_AuthMode.login);
      setState(() {
        _info = 'Password updated. Log in with your new password.';
      });
    } on AuthApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resendOtp() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _api.sendOtp(email: _email.text.trim().toLowerCase(), purpose: _otpPurpose);
      if (!mounted) return;
      setState(() {
        _info = 'We sent a new 6-digit code to ${_email.text.trim().toLowerCase()}. $_spamTip';
      });
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
    const gated = {'/profile/edit', '/business', '/business/setup', '/business/coverage'};
    if (next != null && next.startsWith('/') && !gated.contains(next) && !next.startsWith('/business')) {
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

  String get _title => switch (_step) {
        _AuthStep.otp => 'Enter verification code',
        _AuthStep.newPassword => 'Set new password',
        _AuthStep.form => switch (_mode) {
            _AuthMode.restore => 'Restore account',
            _AuthMode.forgot => 'Forgot password',
            _AuthMode.register => 'Create account',
            _AuthMode.login => 'Welcome back',
          },
      };

  String get _sub => switch (_step) {
        _AuthStep.otp => 'Enter the 6-digit code sent to ${_email.text.trim().toLowerCase()}.',
        _AuthStep.newPassword => 'Enter and confirm your new password.',
        _AuthStep.form => switch (_mode) {
            _AuthMode.restore => '',
            _AuthMode.forgot =>
              'Enter your email and we will send a 6-digit code to reset your password.',
            _AuthMode.register => 'One account for everything — find help or list your business.',
            _AuthMode.login => '',
          },
      };

  String get _primaryLabel {
    if (_loading) {
      return switch (_step) {
        _AuthStep.otp => 'Verifying…',
        _AuthStep.newPassword => 'Saving…',
        _AuthStep.form => switch (_mode) {
            _AuthMode.forgot => 'Sending…',
            _AuthMode.restore => 'Sending code…',
            _AuthMode.register => 'Creating…',
            _AuthMode.login => 'Signing in…',
          },
      };
    }
    return switch (_step) {
      _AuthStep.otp => 'Verify code',
      _AuthStep.newPassword => 'Update password',
      _AuthStep.form => switch (_mode) {
          _AuthMode.forgot => 'Send reset code',
          _AuthMode.restore => 'Send restore code',
          _AuthMode.register => 'Create account',
          _AuthMode.login => 'Log in',
        },
    };
  }

  @override
  Widget build(BuildContext context) {
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
                    _title,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.nunito(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  if (_sub.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      _sub,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13.5,
                        color: Colors.white.withValues(alpha: 0.82),
                        height: 1.5,
                      ),
                    ),
                  ],
                  if (_info != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
                      ),
                      child: Text(
                        _info!,
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.45,
                          fontWeight: FontWeight.w600,
                          color: Colors.white.withValues(alpha: 0.92),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  if (_step == _AuthStep.form) ..._buildFormFields(),
                  if (_step == _AuthStep.otp) ..._buildOtpFields(),
                  if (_step == _AuthStep.newPassword) ..._buildNewPasswordFields(),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: const TextStyle(
                        color: Color(0xFFFFD4D6),
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton(
                      onPressed: _loading
                          ? null
                          : () {
                              if (_step == _AuthStep.otp) {
                                _submitOtp();
                              } else if (_step == _AuthStep.newPassword) {
                                _submitNewPassword();
                              } else {
                                _submitForm();
                              }
                            },
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.blueDeep,
                        disabledBackgroundColor: Colors.white.withValues(alpha: 0.7),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppColors.radiusMd),
                        ),
                        textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 15),
                      ),
                      child: _loading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: AppColors.blueDeep,
                              ),
                            )
                          : Text(_primaryLabel),
                    ),
                  ),
                  if (_step == _AuthStep.otp) ...[
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton(
                        onPressed: _loading ? null : _resendOtp,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: BorderSide(color: Colors.white.withValues(alpha: 0.5), width: 1.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppColors.radiusMd),
                          ),
                          textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                        child: const Text('Resend code'),
                      ),
                    ),
                    Center(
                      child: TextButton(
                        onPressed: _loading
                            ? null
                            : () => setState(() {
                                  _step = _AuthStep.form;
                                  _otp.clear();
                                  _resetSession = null;
                                  _error = null;
                                  _info = null;
                                }),
                        child: Text(
                          'Back',
                          style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                  if (_step == _AuthStep.form && _mode != _AuthMode.restore && _mode != _AuthMode.forgot)
                    Center(
                      child: TextButton(
                        onPressed: () => _resetTo(
                          _mode == _AuthMode.login ? _AuthMode.register : _AuthMode.login,
                        ),
                        child: Text(
                          _mode == _AuthMode.login
                              ? 'New here? Create an account'
                              : 'Already have an account? Log in',
                          style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                    ),
                  if (_step == _AuthStep.form &&
                      (_mode == _AuthMode.restore || _mode == _AuthMode.forgot))
                    Center(
                      child: TextButton(
                        onPressed: () => _resetTo(
                          _mode == _AuthMode.restore ? _AuthMode.register : _AuthMode.login,
                        ),
                        child: Text(
                          _mode == _AuthMode.restore ? 'Back to create account' : 'Back to log in',
                          style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                    ),
                  if (_step == _AuthStep.form && _mode != _AuthMode.forgot)
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
                        onTap: () => launchUrl(
                          Uri.parse(AppConfig.termsUrl),
                          mode: LaunchMode.externalApplication,
                        ),
                        child: const Text(
                          'Terms',
                          style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w700),
                        ),
                      ),
                      Text(' & ', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.7))),
                      GestureDetector(
                        onTap: () => launchUrl(
                          Uri.parse(AppConfig.privacyUrl),
                          mode: LaunchMode.externalApplication,
                        ),
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

  List<Widget> _buildFormFields() {
    return [
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
      if (_mode != _AuthMode.forgot) ...[
        const SizedBox(height: 14),
        _label(_mode == _AuthMode.restore ? 'New password' : 'Password'),
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
        if (_mode == _AuthMode.login)
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => _resetTo(_AuthMode.forgot),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.only(top: 6, left: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'Forgot password?',
                style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: Colors.white),
              ),
            ),
          ),
      ],
      if (_mode == _AuthMode.register || _mode == _AuthMode.restore) ...[
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
                _obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined,
              ),
            ),
          ),
        ),
      ],
    ];
  }

  List<Widget> _buildOtpFields() {
    return [
      _label('6-digit code'),
      TextField(
        controller: _otp,
        keyboardType: TextInputType.number,
        textInputAction: TextInputAction.done,
        autofillHints: const [AutofillHints.oneTimeCode],
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(6),
        ],
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w800,
          fontSize: 22,
          letterSpacing: 10,
        ),
        cursorColor: Colors.white,
        decoration: _fieldDecoration('••••••'),
        onSubmitted: (_) {
          if (!_loading) _submitOtp();
        },
      ),
    ];
  }

  List<Widget> _buildNewPasswordFields() {
    return [
      _label('New password'),
      TextField(
        controller: _password,
        obscureText: _obscure,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        cursorColor: Colors.white,
        decoration: _fieldDecoration(
          'At least 6 characters',
          suffixIcon: IconButton(
            onPressed: () => setState(() => _obscure = !_obscure),
            icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
          ),
        ),
      ),
      const SizedBox(height: 14),
      _label('Confirm new password'),
      TextField(
        controller: _confirm,
        obscureText: _obscureConfirm,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        cursorColor: Colors.white,
        decoration: _fieldDecoration(
          'Re-enter password',
          suffixIcon: IconButton(
            onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
            icon: Icon(
              _obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined,
            ),
          ),
        ),
      ),
    ];
  }
}
