import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';

class JobsFeedScreen extends ConsumerStatefulWidget {
  const JobsFeedScreen({super.key});

  @override
  ConsumerState<JobsFeedScreen> createState() => _JobsFeedScreenState();
}

class _JobsFeedScreenState extends ConsumerState<JobsFeedScreen> {
  List<Job> _jobs = [];
  Business? _business;
  final Set<String> _sent = {};
  bool _loading = true;
  String? _pincode;

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
      final pin = profile?.pincode;
      final jobs = business == null
          ? <Job>[]
          : await repo.fetchOpenJobsForBusiness(business.id, categoryId: business.category?.id);
      if (!mounted) return;
      setState(() {
        _pincode = pin;
        _business = business;
        _jobs = jobs.where((j) => j.customerId != repo.userId).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAppSnack(context, e.toString());
    }
  }

  Future<void> _interested(Job job) async {
    if (ref.read(repoProvider).userId == null) {
      context.push('/login?next=/jobs-feed');
      return;
    }
    if (_business == null) {
      showAppSnack(context, 'Set up your business first to respond to jobs');
      context.push('/business/setup');
      return;
    }
    try {
      await ref.read(repoProvider).expressInterest(jobId: job.id, businessId: _business!.id);
      if (!mounted) return;
      setState(() => _sent.add(job.id));
      showAppSnack(context, 'Interest sent');
    } catch (e) {
      if (!mounted) return;
      showAppSnack(context, e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.blueDeep));

    return RefreshIndicator(
      color: AppColors.blueDeep,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          ScreenTopBar(
            eyebrow: _business == null ? 'Provider' : 'Business · ${_business!.name}',
            title: 'Job Feed',
          ),
          if (_business != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 6),
              child: Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: AppColors.blueDeep,
                  borderRadius: BorderRadius.circular(AppColors.radiusLg),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF1F8E7B).withValues(alpha: 0.28),
                      blurRadius: 30,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('YOUR RESPONSE RATE', style: eyebrowStyle(color: Colors.white.withValues(alpha: 0.75))),
                          const SizedBox(height: 6),
                          Text(
                            'You respond faster than ${_business!.responseRate}% of nearby providers',
                            style: GoogleFonts.nunito(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700, height: 1.35),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(
                      width: 72,
                      height: 72,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 72,
                            height: 72,
                            child: CircularProgressIndicator(
                              value: _business!.responseRate / 100,
                              strokeWidth: 7,
                              backgroundColor: Colors.white.withValues(alpha: 0.28),
                              valueColor: const AlwaysStoppedAnimation(Colors.white),
                              strokeCap: StrokeCap.round,
                            ),
                          ),
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('${_business!.responseRate}%', style: monoStyle(fontSize: 14, color: Colors.white)),
                              Text('Response', style: TextStyle(fontSize: 8, color: Colors.white.withValues(alpha: 0.85))),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (_business == null)
            SoftCard(
              margin: const EdgeInsets.fromLTRB(20, 8, 20, 8),
              onTap: () => context.push(
                ref.read(repoProvider).userId == null ? '/login?next=/business/setup' : '/business/setup',
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(color: AppColors.blueSoft, borderRadius: BorderRadius.circular(14)),
                    child: const Icon(Icons.storefront_outlined, color: AppColors.blueDeep),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ref.read(repoProvider).userId == null ? 'Log in to list your business' : 'List your business',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          ref.read(repoProvider).userId == null
                              ? 'Create a free account to respond to nearby job requests.'
                              : 'Respond to nearby job requests for free.',
                          style: const TextStyle(fontSize: 11.5, color: AppColors.inkSoft),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.blueDeep),
                ],
              ),
            ),
          if (_business != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 6),
              child: Row(
                children: [
                  _StatTile(icon: Icons.inbox_outlined, value: '${_jobs.length}', label: 'Open nearby', color: AppColors.blueSoft, iconColor: AppColors.blueDeep),
                  const SizedBox(width: 11),
                  _StatTile(icon: Icons.favorite_border, value: '${_sent.length}', label: 'Interested', color: AppColors.indigoSoft, iconColor: AppColors.indigo),
                  const SizedBox(width: 11),
                  _StatTile(icon: Icons.star_outline, value: _business!.rating.toStringAsFixed(1), label: 'Your rating', color: AppColors.greenSoft, iconColor: AppColors.greenDeep),
                ],
              ),
            ),
          SectionHeader(
            title: 'Open requests',
            trailing: Text(
              _pincode == null ? 'Add pincode' : '${_jobs.length} posts',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
            ),
          ),
          if (_jobs.isEmpty)
            SoftCard(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                _business == null
                    ? 'Set up your business and service areas to see matching jobs.'
                    : _pincode == null
                    ? 'Add a pincode in your profile to go live near customers.'
                    : 'No open jobs in your service area right now.',
                style: const TextStyle(color: AppColors.inkSoft),
              ),
            )
          else
            ..._jobs.map((j) {
              final sent = _sent.contains(j.id);
              return SoftCard(
                margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                padding: const EdgeInsets.all(15),
                onTap: () => context.push('/jobs/${j.id}'),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.blueSoft,
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Text(
                        j.category?.name ?? 'Service',
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(j.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.35)),
                    const SizedBox(height: 6),
                    Text(
                      j.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: AppColors.inkSoft, height: 1.4),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Text('🕐 ', style: const TextStyle(fontSize: 11)),
                        Text(timeAgo(j.createdAt), style: monoStyle(fontSize: 11, color: AppColors.inkSoft)),
                        const SizedBox(width: 14),
                        const Text('📍 ', style: TextStyle(fontSize: 11)),
                        Text(
                          locationLabel(area: j.area, locality: j.locality, pincode: j.pincode),
                          style: monoStyle(fontSize: 11, color: AppColors.inkSoft),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.only(top: 12),
                      decoration: const BoxDecoration(
                        border: Border(top: BorderSide(color: AppColors.line)),
                      ),
                      child: Row(
                        children: [
                          Text(j.budgetLabel, style: monoStyle(fontSize: 13.5)),
                          const Spacer(),
                          InterestButton(
                            sent: sent,
                            onPressed: () => _interested(j),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
    required this.iconColor,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color color;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: SoftCard(
        padding: const EdgeInsets.fromLTRB(8, 12, 8, 12),
        radius: 18,
        child: Column(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, size: 18, color: iconColor),
            ),
            const SizedBox(height: 8),
            Text(value, style: monoStyle(fontSize: 15)),
            const SizedBox(height: 2),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, color: AppColors.inkSoft, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
