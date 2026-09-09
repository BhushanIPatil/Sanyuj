import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers.dart';
import '../../config/app_config.dart';
import '../../models/models.dart';
import '../../services/auth_api.dart';
import '../../services/guest.dart';
import '../../services/push_notifications.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/change_password_dialog.dart';
import '../../widgets/common.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  Profile? _profile;
  Business? _business;
  bool _loading = true;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final repo = ref.read(repoProvider);
      final profile = await repo.fetchProfile();
      final business = await repo.fetchMyBusiness();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _business = business;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAppErrorAlert(context, e, actionLabel: 'Retry', onAction: _load);
    }
  }

  Future<void> _openUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      var ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!ok) {
        ok = await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
      if (!ok && mounted) showAppErrorSnack(context, 'Could not open link');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    }
  }

  Future<void> _logout() async {
    final ok = await showLogoutConfirmDialog(context);
    if (ok != true || !mounted) return;
    try {
      await PushNotifications.deactivateCurrentDevice();
      await GuestSession.instance.enter();
      await Supabase.instance.client.auth.signOut();
      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    }
  }

  Future<void> _changePassword() async {
    final email = _profile?.email?.trim();
    if (email == null || email.isEmpty) {
      showAppSnack(context, 'No email on this account');
      return;
    }
    final ok = await showChangePasswordDialog(context, email: email);
    if (ok == true && mounted) {
      showAppSnack(context, 'Password updated');
    }
  }

  Future<void> _deleteAccount() async {
    final ok = await showDeleteConfirmDialog(
      context,
      title: 'Delete account?',
      message:
          'This permanently deactivates your Sanyuj account and associated business data. '
          'You can restore later by registering again with the same email.',
    );
    if (ok != true) return;

    setState(() => _deleting = true);
    try {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      if (token == null) throw Exception('Not signed in');
      await PushNotifications.deactivateCurrentDevice();
      await AuthApi().deleteAccount(token);
      await Supabase.instance.client.auth.signOut();
      await GuestSession.instance.enter();
      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
      setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authStateProvider, (previous, next) {
      next.whenData((_) {
        if (mounted) _load();
      });
    });

    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.blueDeep));
    final isGuest = ref.watch(repoProvider).userId == null;
    if (isGuest) {
      return ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          const ScreenTopBar(title: 'Profile'),
          GuestPrompt(
            title: "You're browsing as a guest",
            body: 'Log in with your email to save your location and list a business.',
            onLogin: () => context.push('/login?next=/profile'),
          ),
        ],
      );
    }
    final p = _profile;
    final location = locationLabel(area: p?.area, locality: p?.locality, pincode: p?.pincode, address: p?.address);

    return ListView(
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        const ScreenTopBar(title: 'Profile'),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 18),
          child: Column(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.blueDeep,
                  borderRadius: BorderRadius.circular(26),
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF1F8E7B).withValues(alpha: 0.28),
                      blurRadius: 24,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    initials(p?.fullName),
                    style: GoogleFonts.nunito(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(p?.fullName ?? 'Your name', style: GoogleFonts.nunito(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              SoftCard(
                padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
                onTap: () => context.push('/profile/edit'),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (p?.email != null && p!.email!.isNotEmpty)
                            Row(
                              children: [
                                const Icon(Icons.email_outlined, size: 16, color: AppColors.inkSoft),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    p.email!,
                                    style: const TextStyle(fontSize: 12.5, color: AppColors.inkSoft, fontWeight: FontWeight.w500),
                                  ),
                                ),
                              ],
                            ),
                          if (p?.phone != null && p!.phone!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.phone_outlined, size: 16, color: AppColors.inkSoft),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    displayPhone(p.phone!),
                                    style: monoStyle(fontSize: 12.5, color: AppColors.inkSoft, fontWeight: FontWeight.w500),
                                  ),
                                ),
                              ],
                            ),
                          ],
                          if (location.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.location_on_outlined, size: 16, color: AppColors.inkSoft),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    location,
                                    style: const TextStyle(fontSize: 12.5, color: AppColors.inkSoft, fontWeight: FontWeight.w500, height: 1.35),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: AppColors.blueSoft,
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: const Text('Edit', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.blueDeep)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (_business == null)
          SoftCard(
            margin: const EdgeInsets.fromLTRB(20, 0, 20, 18),
            radius: AppColors.radiusLg,
            padding: const EdgeInsets.all(18),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(color: AppColors.blueSoft, borderRadius: BorderRadius.circular(15)),
                      child: const Icon(Icons.storefront_outlined, color: AppColors.blueDeep),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('List your business', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                          SizedBox(height: 3),
                          Text(
                            'Get found by neighbours nearby — free, takes under a minute.',
                            style: TextStyle(fontSize: 11.5, color: AppColors.inkSoft, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppColors.blueDeep,
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => context.push('/business'),
                        borderRadius: BorderRadius.circular(100),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Text(
                            'Get Started',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          )
        else
          Container(
            margin: const EdgeInsets.fromLTRB(20, 0, 20, 18),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.blueSoft,
              borderRadius: BorderRadius.circular(AppColors.radiusLg),
              boxShadow: AppColors.cardShadow,
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    AvatarBadge(
                      label: initials(_business!.name),
                      imageUrl: _business!.photoUrl,
                      size: 52,
                      radius: 16,
                      background: AppColors.blueDeep,
                      foreground: Colors.white,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_business!.name, style: GoogleFonts.nunito(fontSize: 15, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.blueSoft,
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              '${_business!.category?.emoji ?? ''} ${_business!.category?.name ?? 'Service'}'.trim(),
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppColors.blueDeep,
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => context.push('/business'),
                        borderRadius: BorderRadius.circular(100),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Text(
                            'Manage business',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        SoftCard(
          margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              _MenuItem(
                icon: Icons.storefront_outlined,
                iconColor: AppColors.greenDeep,
                label: 'Your Business',
                onTap: () => context.push('/business'),
              ),
              const Divider(height: 1, color: AppColors.line),
              _MenuItem(
                icon: Icons.description_outlined,
                iconColor: AppColors.indigo,
                label: 'Terms of Use',
                onTap: () => _openUrl(AppConfig.termsUrl),
              ),
              const Divider(height: 1, color: AppColors.line),
              _MenuItem(
                icon: Icons.privacy_tip_outlined,
                iconColor: AppColors.teal,
                label: 'Privacy Policy',
                onTap: () => _openUrl(AppConfig.privacyUrl),
              ),
              const Divider(height: 1, color: AppColors.line),
              _MenuItem(
                icon: Icons.support_agent_rounded,
                iconColor: AppColors.greenDeep,
                label: 'Help & Support',
                onTap: () => _openUrl(AppConfig.helpUrl),
              ),
              const Divider(height: 1, color: AppColors.line),
              _MenuItem(
                icon: Icons.logout_rounded,
                label: 'Log out',
                danger: true,
                onTap: _logout,
              ),
            ],
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
          child: Text(
            'ACCOUNT SETTINGS',
            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: AppColors.inkSoft, letterSpacing: 0.4),
          ),
        ),
        SoftCard(
          margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          padding: EdgeInsets.zero,
          child: _MenuItem(
            icon: Icons.lock_outline_rounded,
            iconColor: AppColors.blueDeep,
            label: 'Change password',
            onTap: _changePassword,
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
          child: Text(
            'DANGER ZONE',
            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: AppColors.rose, letterSpacing: 0.4),
          ),
        ),
        SoftCard(
          margin: const EdgeInsets.fromLTRB(20, 0, 20, 10),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Delete your account and associated data from Sanyuj.',
                style: TextStyle(fontSize: 12.5, color: AppColors.inkSoft, height: 1.4),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _deleting ? null : _deleteAccount,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.rose,
                  side: const BorderSide(color: AppColors.rose, width: 1.5),
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                ),
                child: _deleting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.rose))
                    : Text('Delete account', style: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 14)),
              ),
            ],
          ),
        ),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 28),
          child: Text(
            'Account deletion is required by Google Play policy. Deleting soft-removes your data from Sanyuj.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, color: AppColors.inkFaint, height: 1.4),
          ),
        ),
      ],
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
    this.iconColor,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final color = danger ? AppColors.rose : (iconColor ?? AppColors.ink);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(11)),
              child: Icon(icon, size: 16, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: danger ? AppColors.rose : AppColors.ink,
                ),
              ),
            ),
            if (!danger) const Icon(Icons.chevron_right_rounded, color: AppColors.inkFaint, size: 20),
          ],
        ),
      ),
    );
  }
}
