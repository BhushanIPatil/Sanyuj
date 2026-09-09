import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/errors.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/go_live_card.dart';
import 'setup_screen.dart';

/// Read-only view of the owner's listing. Editing happens on `/business/setup`
/// so opening "Manage business" never lands straight in a form.
class BusinessScreen extends ConsumerStatefulWidget {
  const BusinessScreen({super.key});

  @override
  ConsumerState<BusinessScreen> createState() => _BusinessScreenState();
}

class _BusinessScreenState extends ConsumerState<BusinessScreen> {
  Business? _business;
  Profile? _profile;
  int _areaCount = 0;
  bool _ready = false;
  bool _deleting = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    setState(() {
      _ready = false;
      _loadError = null;
    });
    try {
      final repo = ref.read(repoProvider);
      final profile = await repo.fetchProfile();
      final business = await repo.fetchMyBusiness();
      final areas = business == null
          ? const <Map<String, dynamic>>[]
          : await repo.fetchBusinessCoverage(business.id);
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _business = business;
        _areaCount = areas.length;
        _ready = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = friendlyError(e);
        _ready = true;
      });
    }
  }

  Future<void> _edit() async {
    await context.push('/business/setup');
    if (!mounted) return;
    await _boot();
  }

  Future<void> _delete() async {
    final biz = _business;
    if (biz == null) return;
    final ok = await showDeleteConfirmDialog(
      context,
      title: 'Delete your business?',
      message:
          'Neighbours will no longer see this listing. You can create a new business later. Your Sanyuj account stays active.',
    );
    if (ok != true) return;
    setState(() => _deleting = true);
    try {
      final repo = ref.read(repoProvider);
      await repo.deleteOwnBusiness();
      await repo.removeStoredBusinessPhoto(biz.photoUrl);
      if (!mounted) return;
      setState(() {
        _business = null;
        _areaCount = 0;
      });
      showAppSnack(context, 'Business listing removed');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const Scaffold(
        backgroundColor: AppColors.bgApp,
        body: SafeArea(
          child: Center(child: CircularProgressIndicator(color: AppColors.blueDeep)),
        ),
      );
    }

    if (_loadError != null) {
      return Scaffold(
        backgroundColor: AppColors.bgApp,
        body: SafeArea(
          child: Column(
            children: [
              ScreenTopBar(title: 'Your Business', showBack: true, onBack: () => context.pop()),
              Expanded(
                child: EmptyState(
                  icon: Icons.cloud_off_outlined,
                  title: 'Could not load business',
                  message: _loadError!,
                  iconColor: AppColors.rose,
                  iconBackground: AppColors.roseSoft,
                  action: PrimaryButton(label: 'Try again', onPressed: _boot),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Nothing to show yet — go straight to the form so listing stays one tap away.
    final biz = _business;
    if (biz == null) return const BusinessSetupScreen();

    final phone = _profile?.phone;
    final address = _profile?.address;

    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        child: Column(
          children: [
            ScreenTopBar(title: 'Your Business', showBack: true, onBack: () => context.pop()),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
                children: [
                  GoLiveCard(
                    businessId: biz.id,
                    pincode: _profile?.pincode,
                    margin: const EdgeInsets.only(bottom: 16),
                  ),
                  SoftCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            AvatarBadge(
                              label: initials(biz.name),
                              imageUrl: biz.photoUrl,
                              size: 60,
                              radius: 18,
                              background: AppColors.tealSoft,
                              foreground: AppColors.teal,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    biz.name,
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                                  ),
                                  if (biz.category != null) ...[
                                    const SizedBox(height: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                      decoration: BoxDecoration(
                                        color: AppColors.blueSoft,
                                        borderRadius: BorderRadius.circular(100),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          if ((biz.category!.emoji ?? '').trim().isNotEmpty) ...[
                                            CategoryIcon(
                                              value: biz.category!.emoji,
                                              size: 16,
                                              radius: 5,
                                              fallback: '•',
                                            ),
                                            const SizedBox(width: 6),
                                          ],
                                          Text(
                                            biz.category!.name,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.blueDeep,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _DetailRow(
                          icon: Icons.call_outlined,
                          label: 'Contact number',
                          value: (phone ?? '').isEmpty ? 'Not shared' : displayPhone(phone!),
                        ),
                        _DetailRow(
                          icon: Icons.place_outlined,
                          label: 'Address',
                          value: (address ?? '').trim().isEmpty ? 'Not shared' : address!.trim(),
                        ),
                        _DetailRow(
                          icon: Icons.map_outlined,
                          label: 'Service areas',
                          value: _areaCount == 0
                              ? 'None added yet'
                              : '$_areaCount ${_areaCount == 1 ? 'area' : 'areas'} covered',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  PrimaryButton(label: 'Edit business', onPressed: _edit),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => context.push('/business/coverage'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.ink,
                      side: const BorderSide(color: AppColors.line, width: 1.5),
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                    ),
                    child: const Text('Service areas', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'DANGER ZONE',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.rose,
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SoftCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Remove this listing from Sanyuj. Your account stays active and you can list again later.',
                          style: TextStyle(fontSize: 12.5, color: AppColors.inkSoft, height: 1.4),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton(
                          onPressed: _deleting ? null : _delete,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.rose,
                            side: const BorderSide(color: AppColors.rose, width: 1.5),
                            minimumSize: const Size.fromHeight(48),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppColors.radiusMd),
                            ),
                          ),
                          child: _deleting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.rose),
                                )
                              : const Text('Delete business', style: TextStyle(fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 17, color: AppColors.inkFaint),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 11, color: AppColors.inkFaint)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
