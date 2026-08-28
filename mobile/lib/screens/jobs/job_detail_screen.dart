import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';

class JobDetailScreen extends ConsumerStatefulWidget {
  const JobDetailScreen({super.key, required this.jobId});

  final String jobId;

  @override
  ConsumerState<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends ConsumerState<JobDetailScreen> {
  Job? _job;
  Business? _business;
  bool _loading = true;
  bool _sent = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final repo = ref.read(repoProvider);
    final job = await repo.fetchJob(widget.jobId);
    final business = await repo.fetchMyBusiness();
    if (!mounted) return;
    setState(() {
      _job = job;
      _business = business;
      _loading = false;
    });
  }

  Future<void> _interest() async {
    if (_job == null || _business == null) {
      context.push('/business/setup');
      return;
    }
    try {
      await ref.read(repoProvider).expressInterest(jobId: _job!.id, businessId: _business!.id);
      if (!mounted) return;
      setState(() => _sent = true);
      showAppSnack(context, 'Interest sent');
    } catch (e) {
      if (!mounted) return;
      showAppSnack(context, e.toString());
    }
  }

  String _urgencyLabel(String? u) {
    switch (u) {
      case 'today':
        return 'Today';
      case 'this_week':
        return 'This week';
      default:
        return 'Flexible';
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = _job;
    final isOwner = job != null && job.customerId == ref.read(repoProvider).userId;
    final canInterest = job != null && !isOwner && job.status == 'open';

    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.blueDeep))
            : job == null
                ? const Center(child: Text('Job not found'))
                : Column(
                    children: [
                      ScreenTopBar(
                        eyebrow: 'Job · ${jobStatusLabel(job.status)}',
                        title: job.title.length > 28 ? '${job.title.substring(0, 28)}…' : job.title,
                        showBack: true,
                        onBack: () => context.pop(),
                      ),
                      Expanded(
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                          children: [
                            SoftCard(
                              radius: AppColors.radiusLg,
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${job.category?.name ?? 'Service'} · ${locationLabel(locality: job.locality, pincode: job.pincode)}'.toUpperCase(),
                                    style: eyebrowStyle(),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    job.title,
                                    style: GoogleFonts.nunito(fontSize: 16.5, fontWeight: FontWeight.w700, height: 1.3),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    job.description,
                                    style: const TextStyle(fontSize: 12.5, color: AppColors.inkSoft, height: 1.5),
                                  ),
                                  const SizedBox(height: 14),
                                  Row(
                                    children: [
                                      _StatBox(value: job.budgetLabel, label: 'Budget'),
                                      const SizedBox(width: 10),
                                      _StatBox(value: _urgencyLabel(job.urgency), label: 'Timeline'),
                                      const SizedBox(width: 10),
                                      _StatBox(value: timeAgo(job.createdAt), label: 'Posted'),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            if (canInterest) ...[
                              const SizedBox(height: 18),
                              PrimaryButton(
                                label: _sent ? 'Interest Sent ✓' : "Send Interest — Customer will call you",
                                onPressed: _sent ? null : _interest,
                              ),
                              const SizedBox(height: 10),
                              const Text(
                                'Your phone number is shared only after the customer chooses to call you.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 12, color: AppColors.inkFaint, height: 1.5),
                              ),
                            ],
                            if (isOwner) ...[
                              const SizedBox(height: 16),
                              SoftCard(
                                child: Row(
                                  children: [
                                    StatusChip(label: jobStatusLabel(job.status), open: job.status == 'open'),
                                    const Spacer(),
                                    Text(job.budgetLabel, style: monoStyle(fontSize: 14)),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(value, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis, style: monoStyle(fontSize: 12.5)),
            const SizedBox(height: 2),
            Text(
              label.toUpperCase(),
              style: const TextStyle(fontSize: 9.5, color: AppColors.inkSoft, letterSpacing: 0.4),
            ),
          ],
        ),
      ),
    );
  }
}
