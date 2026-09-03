import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
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
      showAppErrorAlert(context, e, actionLabel: 'Retry', onAction: () => _load());
    }
  }

  Future<void> _openPostJob({String? editId}) async {
    final path = editId == null ? '/post-job' : '/post-job?edit=$editId';
    final result = await context.push<Object?>(path);
    if (!mounted) return;
    if (result == true || result == null) {
      await _load(silent: true);
      if (mounted && result == true) setState(() => _showOpen = true);
    }
  }

  Future<void> _deleteJob(Job job) async {
    final ok = await showDeleteConfirmDialog(
      context,
      title: 'Delete job?',
      message: 'This removes the job from your list. Providers will no longer see it.',
    );
    if (ok != true) return;
    try {
      await ref.read(repoProvider).deleteJob(job.id);
      if (!mounted) return;
      showAppSnack(context, 'Job deleted');
      await _load(silent: true);
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    }
  }

  StatusChipTone _toneFor(Job j) {
    if (j.status == 'open') return StatusChipTone.open;
    if ((j.closedWithBusinessId ?? '').isNotEmpty) return StatusChipTone.done;
    return StatusChipTone.closed;
  }

  String _statusLabel(Job j) {
    if (j.status == 'open') return 'Open';
    if ((j.closedWithBusinessId ?? '').isNotEmpty) return 'Done';
    return 'Closed';
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authStateProvider, (previous, next) {
      next.whenData((_) {
        if (mounted) _load();
      });
    });
    ref.listen(myJobsRefreshTickProvider, (previous, next) {
      if (previous != next && mounted) {
        _load(silent: true);
        setState(() => _showOpen = true);
      }
    });

    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.blueDeep));

    final isGuest = ref.watch(repoProvider).userId == null;
    if (isGuest) {
      return ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          const ScreenTopBar(title: 'My Jobs'),
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
      onRefresh: () => _load(),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: ScreenTopBar(
              title: 'My Jobs',
              trailing: TextButton.icon(
                onPressed: () => _openPostJob(),
                icon: const Icon(Icons.add_circle_outline_rounded, size: 18, color: AppColors.blueDeep),
                label: const Text('Post', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.blueDeep)),
              ),
            ),
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: _StickyTabsDelegate(
              child: Container(
                color: AppColors.bgApp,
                padding: const EdgeInsets.fromLTRB(20, 6, 20, 12),
                child: Container(
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
              ),
            ),
          ),
          if (_jobs.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(
                icon: Icons.work_outline_rounded,
                title: 'No jobs yet',
                message: 'Post a request and nearby providers can respond.',
                action: SizedBox(
                  width: double.infinity,
                  child: PrimaryButton(label: 'Post a job', onPressed: () => _openPostJob()),
                ),
              ),
            )
          else if (shown.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(
                icon: _showOpen ? Icons.inbox_outlined : Icons.check_circle_outline_rounded,
                title: _showOpen ? 'No open jobs' : 'No closed jobs',
                message: _showOpen
                    ? 'Your open requests will show up here.'
                    : 'Closed deals and finished jobs will appear here.',
                iconColor: _showOpen ? AppColors.blueDeep : AppColors.greenDeep,
                iconBackground: _showOpen ? AppColors.blueSoft : AppColors.greenSoft,
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.only(bottom: 24),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, i) {
                    final j = shown[i];
                    final tone = _toneFor(j);
                    final done = tone == StatusChipTone.done;
                    return SoftCard(
                      margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                      padding: EdgeInsets.zero,
                      onTap: () async {
                        final result = await context.push<String>('/jobs/${j.id}');
                        if (!mounted) return;
                        await _load(silent: true);
                        if (!mounted) return;
                        if (result == 'closed') setState(() => _showOpen = false);
                        if (result == 'open') setState(() => _showOpen = true);
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(AppColors.radiusMd),
                          border: Border(
                            left: BorderSide(
                              width: 4,
                              color: switch (tone) {
                                StatusChipTone.open => AppColors.greenDeep,
                                StatusChipTone.done => AppColors.blueDeep,
                                StatusChipTone.closed => AppColors.amber,
                              },
                            ),
                          ),
                        ),
                        padding: const EdgeInsets.fromLTRB(12, 15, 15, 15),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Text(
                                    j.title,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.35),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                StatusChip(label: _statusLabel(j), tone: tone),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${j.category?.name ?? 'Service'} · ${timeAgo(j.createdAt)} · ${locationLabel(area: j.area, locality: j.locality, pincode: j.pincode)}',
                              style: const TextStyle(fontSize: 12, color: AppColors.inkSoft, height: 1.4),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.only(top: 12),
                              decoration: const BoxDecoration(
                                border: Border(top: BorderSide(color: AppColors.line)),
                              ),
                              child: Row(
                                children: [
                                  Text(j.budgetLabel, style: currencyStyle(fontSize: 13.5)),
                                  const Spacer(),
                                  if (j.status == 'open')
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          tooltip: 'Edit',
                                          onPressed: () => _openPostJob(editId: j.id),
                                          icon: const Icon(Icons.edit_outlined, size: 20, color: AppColors.blueDeep),
                                          visualDensity: VisualDensity.compact,
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                        ),
                                        IconButton(
                                          tooltip: 'Delete',
                                          onPressed: () => _deleteJob(j),
                                          icon: const Icon(Icons.delete_outline_rounded, size: 20, color: AppColors.rose),
                                          visualDensity: VisualDensity.compact,
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                        ),
                                      ],
                                    )
                                  else
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                      decoration: BoxDecoration(
                                        color: done ? AppColors.blueSoft : AppColors.amberSoft,
                                        borderRadius: BorderRadius.circular(100),
                                      ),
                                      child: Text(
                                        done ? 'Done ✓' : 'Closed',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: done ? AppColors.blueDeep : AppColors.amber,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                  childCount: shown.length,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StickyTabsDelegate extends SliverPersistentHeaderDelegate {
  _StickyTabsDelegate({required this.child});

  final Widget child;

  @override
  double get minExtent => 58;

  @override
  double get maxExtent => 58;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return child;
  }

  @override
  bool shouldRebuild(covariant _StickyTabsDelegate oldDelegate) => true;
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
