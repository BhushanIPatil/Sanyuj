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
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
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
      showAppSnack(context, e.toString());
    }
  }

  Future<void> _logout() async {
    await GuestSession.instance.clear();
    await Supabase.instance.client.auth.signOut();
    if (!mounted) return;
    context.go('/login');
  }

  Future<void> _deleteAccount() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
        title: Text('Delete account?', style: GoogleFonts.nunito(fontWeight: FontWeight.w700)),
        content: const Text(
          'This permanently deactivates your Sanyuj account and associated jobs/business data. '
          'You can restore later by registering again with the same number.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.rose),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    setState(() => _deleting = true);
    try {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      if (token == null) throw Exception('Not signed in');
      await AuthApi().deleteAccount(token);
      await Supabase.instance.client.auth.signOut();
      if (!mounted) return;
      context.go('/login');
    } catch (e) {
      if (!mounted) return;
      showAppSnack(context, e.toString().replaceFirst('Exception: ', ''));
      setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.blueDeep));
    final isGuest = ref.read(repoProvider).userId == null;
    if (isGuest) {
      return ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          const ScreenTopBar(eyebrow: 'Account', title: 'Profile'),
          GuestPrompt(
            title: "You're browsing as a guest",
            body: 'Log in with your mobile number to post jobs, save your location, and list a business.',
            onLogin: () => context.push('/login?next=/profile'),
          ),
        ],
      );
    }
    final p = _profile;
    final location = locationLabel(locality: p?.locality, pincode: p?.pincode, address: p?.address);

    return ListView(
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        const ScreenTopBar(eyebrow: 'Account', title: 'Profile'),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 18),
          child: Column(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  gradient: AppColors.heroGradient,
                  borderRadius: BorderRadius.circular(26),
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
              const SizedBox(height: 3),
              Text(
                p?.phone != null ? displayPhone(p!.phone) : '',
                style: monoStyle(fontSize: 12, color: AppColors.inkSoft, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
        SoftCard(
          margin: const EdgeInsets.fromLTRB(20, 0, 20, 18),
          padding: const EdgeInsets.all(14),
          onTap: () => context.push('/profile/edit'),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('SAVED LOCATION', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: AppColors.inkSoft, letterSpacing: 0.4)),
                    const SizedBox(height: 3),
                    Text(
                      location.isEmpty ? '—' : location,
                      style: monoStyle(fontSize: 14),
                    ),
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
                            'Get job requests from nearby customers — free, takes under a minute.',
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
                      gradient: AppColors.heroGradient,
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => context.push('/business/setup'),
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
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFF2F9FF), Color(0xFFEFFBF5)],
              ),
              borderRadius: BorderRadius.circular(AppColors.radiusLg),
              boxShadow: AppColors.cardShadow,
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    AvatarBadge(
                      label: initials(_business!.name),
                      size: 52,
                      radius: 16,
                      gradient: AppColors.heroGradient,
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
                Row(
                  children: [
                    _BizStat(value: '${_business!.jobsDone}', label: 'Jobs Done'),
                    const SizedBox(width: 10),
                    _BizStat(value: '${_business!.rating.toStringAsFixed(1)}★', label: 'Rating'),
                    const SizedBox(width: 10),
                    _BizStat(value: '${_business!.responseRate}%', label: 'Response'),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => context.go('/jobs-feed'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.ink,
                          side: const BorderSide(color: AppColors.line, width: 1.5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                          padding: const EdgeInsets.symmetric(vertical: 11),
                        ),
                        child: Text('Edit listing', style: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 11.5)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: AppColors.heroGradient,
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => context.go('/jobs-feed'),
                            borderRadius: BorderRadius.circular(100),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 11),
                              child: Text(
                                'Open Job Feed →',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11.5),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
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
                icon: Icons.calendar_today_outlined,
                label: 'My Jobs',
                onTap: () => context.go('/my-jobs'),
              ),
              const Divider(height: 1, color: AppColors.line),
              _MenuItem(
                icon: Icons.help_outline_rounded,
                label: 'Help & Support',
                onTap: () => launchUrl(Uri.parse('mailto:${AppConfig.supportEmail}')),
              ),
              const Divider(height: 1, color: AppColors.line),
              _MenuItem(
                icon: Icons.privacy_tip_outlined,
                label: 'Privacy Policy',
                onTap: () => launchUrl(Uri.parse(AppConfig.privacyUrl)),
              ),
              const Divider(height: 1, color: AppColors.line),
              _MenuItem(
                icon: Icons.description_outlined,
                label: 'Terms of Service',
                onTap: () => launchUrl(Uri.parse(AppConfig.termsUrl)),
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
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: OutlinedButton(
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
        ),
        const SizedBox(height: 8),
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

class _BizStat extends StatelessWidget {
  const _BizStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
        child: Column(
          children: [
            Text(value, style: monoStyle(fontSize: 13)),
            const SizedBox(height: 2),
            Text(label.toUpperCase(), style: const TextStyle(fontSize: 9, color: AppColors.inkSoft, letterSpacing: 0.3)),
          ],
        ),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
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
              child: Icon(icon, size: 16, color: danger ? AppColors.rose : AppColors.ink),
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
