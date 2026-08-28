import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';

class MyJobsScreen extends ConsumerStatefulWidget {
  const MyJobsScreen({super.key});

  @override
  ConsumerState<MyJobsScreen> createState() => _MyJobsScreenState();
}

class _MyJobsScreenState extends ConsumerState<MyJobsScreen> {
  List<Job> _jobs = [];
  bool _loading = true;
  bool _showOpen = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final jobs = await ref.read(repoProvider).fetchMyJobs();
      if (!mounted) return;
      setState(() {
        _jobs = jobs;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAppSnack(context, e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.blueDeep));

    final isGuest = ref.read(repoProvider).userId == null;
    if (isGuest) {
      return ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          const ScreenTopBar(eyebrow: "Requests you've posted", title: 'My Jobs'),
          GuestPrompt(
            title: 'Log in to post a job',
            body: 'Guests can browse providers. Create a free account to post a job and track responses.',
            onLogin: () => context.push('/login?next=/post-job'),
          ),
        ],
      );
    }

    final open = _jobs.where((j) => j.status == 'open').toList();
    final closed = _jobs.where((j) => j.status != 'open').toList();
    final shown = _showOpen ? open : closed;

    return RefreshIndicator(
      color: AppColors.blueDeep,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          ScreenTopBar(
            eyebrow: "Requests you've posted",
            title: 'My Jobs',
            trailing: TextButton(
              onPressed: () => context.push('/post-job'),
              child: const Text('Post', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.blueDeep)),
            ),
          ),
          Container(
            margin: const EdgeInsets.fromLTRB(20, 6, 20, 16),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(100),
            ),
            child: Row(
              children: [
                _TabPill(
                  label: 'Open (${open.length})',
                  selected: _showOpen,
                  onTap: () => setState(() => _showOpen = true),
                ),
                _TabPill(
                  label: 'Closed (${closed.length})',
                  selected: !_showOpen,
                  onTap: () => setState(() => _showOpen = false),
                ),
              ],
            ),
          ),
          if (_jobs.isEmpty)
            SoftCard(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('No jobs yet', style: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 6),
                  const Text('Post a request and nearby providers can respond.', style: TextStyle(color: AppColors.inkSoft, fontSize: 13)),
                  const SizedBox(height: 14),
                  PrimaryButton(label: 'Post a job', onPressed: () => context.push('/post-job')),
                ],
              ),
            )
          else if (shown.isEmpty)
            SoftCard(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                _showOpen ? 'No open jobs right now.' : 'No closed jobs yet.',
                style: const TextStyle(color: AppColors.inkSoft),
              ),
            )
          else
            ...shown.map(
              (j) => JobCardTile(
                title: j.title,
                subtitle: '${j.category?.name ?? 'Service'} · ${timeAgo(j.createdAt)} · ${locationLabel(locality: j.locality, pincode: j.pincode)}',
                amount: j.budgetLabel,
                statusLabel: jobStatusLabel(j.status),
                open: j.status == 'open',
                trailingLabel: j.status == 'open' ? 'View →' : 'Done ✓',
                onTap: () => context.push('/jobs/${j.id}'),
              ),
            ),
        ],
      ),
    );
  }
}

class _TabPill extends StatelessWidget {
  const _TabPill({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: selected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(100),
            boxShadow: selected ? AppColors.cardShadow : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: selected ? AppColors.ink : AppColors.inkSoft,
            ),
          ),
        ),
      ),
    );
  }
}
