import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/errors.dart';
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
  List<JobInterest> _interests = [];
  bool _loading = true;
  bool _sent = false;
  bool _savingStatus = false;
  bool _showClosePicker = false;
  String? _closeInterestId;
  String? _loadError;
  final _finalAmount = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _finalAmount.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final repo = ref.read(repoProvider);
      final job = await repo.fetchJob(widget.jobId);
      final business = await repo.fetchMyBusiness();
      List<JobInterest> interests = [];
      if (job != null && job.customerId == repo.userId) {
        interests = await repo.fetchJobInterests(job.id);
      }
      if (!mounted) return;
      setState(() {
        _job = job;
        _business = business;
        _interests = interests;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = friendlyError(e);
      });
    }
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
      showAppErrorSnack(context, e);
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

  String _defaultFinalAmount(JobInterest? interest) {
    if (interest?.offeredAmount != null) return '${interest!.offeredAmount}';
    final job = _job;
    if (job == null) return '';
    if (job.budgetMin != null && job.budgetMax != null) {
      return '${((job.budgetMin! + job.budgetMax!) / 2).round()}';
    }
    return '${job.budgetMin ?? job.budgetMax ?? ''}';
  }

  JobInterest? _interestById(String? id) {
    if (id == null) return null;
    for (final i in _interests) {
      if (i.id == id) return i;
    }
    return null;
  }

  JobInterest? _selectedInterest() {
    final job = _job;
    if (job == null) return null;
    for (final i in _interests) {
      if (job.closedWithBusinessId != null && i.businessId == job.closedWithBusinessId) return i;
    }
    for (final i in _interests) {
      if (i.status == 'selected') return i;
    }
    return null;
  }

  Future<void> _setStatus(String next) async {
    final job = _job;
    if (job == null || _savingStatus) return;

    if (next == 'closed') {
      final winner = _selectedInterest();
      setState(() {
        _closeInterestId = winner?.id;
        _finalAmount.text = _defaultFinalAmount(winner);
        _showClosePicker = true;
      });
      return;
    }

    if (next == job.status) return;
    setState(() {
      _savingStatus = true;
      _showClosePicker = false;
    });
    try {
      await ref.read(repoProvider).reopenJob(job.id);
      await _load();
      if (!mounted) return;
      showAppSnack(context, 'Job reopened');
      if (mounted) context.pop('open');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _savingStatus = false);
    }
  }

  void _openDealFinal(JobInterest interest) {
    final job = _job;
    if (job == null || job.status != 'open' || _savingStatus) return;
    setState(() {
      _closeInterestId = interest.id;
      _finalAmount.text = _defaultFinalAmount(interest);
      _showClosePicker = true;
    });
  }

  Future<void> _confirmClose() async {
    final job = _job;
    if (job == null || _savingStatus) return;
    final amount = int.tryParse(_finalAmount.text.trim());
    if (amount == null || amount < 0) {
      showAppSnack(context, 'Enter a valid final amount');
      return;
    }
    setState(() => _savingStatus = true);
    try {
      await ref.read(repoProvider).finalizeJobDeal(
            jobId: job.id,
            selectedInterestId: _closeInterestId,
            finalAmount: amount,
          );
      if (!mounted) return;
      setState(() => _showClosePicker = false);
      await _load();
      if (!mounted) return;
      showAppSnack(
        context,
        _closeInterestId != null ? 'Deal closed with selected provider' : 'Job closed without a provider',
      );
      if (mounted) context.pop('closed');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _savingStatus = false);
    }
  }

  Future<void> _call(String? phone, String name) async {
    final digits = phone?.replaceAll(RegExp(r'\D'), '') ?? '';
    if (digits.isEmpty) {
      showAppSnack(context, 'No contact for $name');
      return;
    }
    try {
      await launchUrl(Uri.parse('tel:$digits'), mode: LaunchMode.externalApplication);
    } catch (_) {
      if (!mounted) return;
      showAppSnack(context, 'Could not open dialer');
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = _job;
    final isOwner = job != null && job.customerId == ref.read(repoProvider).userId;
    final canInterest = job != null && !isOwner && job.status == 'open';
    final selectedInterest = _selectedInterest();

    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.blueDeep))
            : _loadError != null
                ? Center(
                    child: EmptyState(
                      icon: Icons.cloud_off_outlined,
                      title: 'Could not load job',
                      message: _loadError!,
                      iconColor: AppColors.rose,
                      iconBackground: AppColors.roseSoft,
                      action: PrimaryButton(label: 'Try again', onPressed: _load),
                    ),
                  )
                : job == null
                ? const Center(child: Text('Job not found'))
                : Column(
                    children: [
                      ScreenTopBar(
                        title: job.title.length > 28 ? '${job.title.substring(0, 28)}…' : job.title,
                        showBack: true,
                        onBack: () => context.pop(),
                        trailing: isOwner && job.status == 'open'
                            ? TextButton(
                                onPressed: () async {
                                  await context.push('/post-job?edit=${job.id}');
                                  if (mounted) _load();
                                },
                                child: const Text(
                                  'Edit',
                                  style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                                ),
                              )
                            : null,
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
                                    '${job.category?.name ?? 'Service'} · ${locationLabel(area: job.area, locality: job.locality, pincode: job.pincode)}'
                                        .toUpperCase(),
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
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: AppColors.surface,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        Text('Budget', style: eyebrowStyle()),
                                        const Spacer(),
                                        Text(job.budgetLabel, style: currencyStyle(fontSize: 14)),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      _StatBox(value: _urgencyLabel(job.urgency), label: 'Timeline'),
                                      const SizedBox(width: 10),
                                      _StatBox(
                                        value: isOwner ? '${_interests.length}' : timeAgo(job.createdAt),
                                        label: isOwner ? 'Interested' : 'Posted',
                                      ),
                                      const SizedBox(width: 10),
                                      _StatBox(value: jobStatusLabel(job.status), label: 'Status'),
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
                              const SizedBox(height: 18),
                              SoftCard(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Status', style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: _StatusToggle(
                                            label: 'Open',
                                            active: job.status == 'open' && !_showClosePicker,
                                            onTap: () => _setStatus('open'),
                                            openStyle: true,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: _StatusToggle(
                                            label: 'Closed',
                                            active: job.status == 'closed' || _showClosePicker,
                                            onTap: () => _setStatus('closed'),
                                            openStyle: false,
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (_showClosePicker) ...[
                                      const SizedBox(height: 14),
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: AppColors.surface,
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(color: AppColors.line, style: BorderStyle.solid),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                              'Closed with which provider?',
                                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                                            ),
                                            const SizedBox(height: 8),
                                            DropdownButtonFormField<String?>(
                                              value: _closeInterestId,
                                              decoration: const InputDecoration(hintText: 'Select provider'),
                                              items: [
                                                const DropdownMenuItem<String?>(
                                                  value: null,
                                                  child: Text('None / closed without provider'),
                                                ),
                                                for (final i in _interests.where((e) => e.businessName != null))
                                                  DropdownMenuItem<String?>(
                                                    value: i.id,
                                                    child: Text(
                                                      '${i.businessName}${i.ownerName != null ? ' · ${i.ownerName}' : ''}',
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                              ],
                                              onChanged: _savingStatus
                                                  ? null
                                                  : (v) {
                                                      setState(() {
                                                        _closeInterestId = v;
                                                        _finalAmount.text = _defaultFinalAmount(_interestById(v));
                                                      });
                                                    },
                                            ),
                                            const SizedBox(height: 12),
                                            const FieldLabel('Final amount'),
                                            TextField(
                                              controller: _finalAmount,
                                              keyboardType: TextInputType.number,
                                              style: currencyStyle(fontSize: 15),
                                              decoration: InputDecoration(
                                                prefixText: '₹ ',
                                                prefixStyle: currencyStyle(fontSize: 15, color: AppColors.greenDeep),
                                                hintText: 'Enter final amount',
                                              ),
                                            ),
                                            const SizedBox(height: 12),
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: OutlinedButton(
                                                    onPressed: _savingStatus
                                                        ? null
                                                        : () => setState(() => _showClosePicker = false),
                                                    child: const Text('Cancel'),
                                                  ),
                                                ),
                                                const SizedBox(width: 10),
                                                Expanded(
                                                  child: FilledButton(
                                                    onPressed: _savingStatus ? null : _confirmClose,
                                                    style: FilledButton.styleFrom(backgroundColor: AppColors.ink),
                                                    child: Text(_savingStatus ? 'Saving…' : 'Confirm'),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                    if (job.status == 'closed' && !_showClosePicker) ...[
                                      const SizedBox(height: 12),
                                      Text(
                                        selectedInterest?.businessName != null
                                            ? 'Deal closed with ${selectedInterest!.businessName}'
                                                '${selectedInterest.ownerName != null ? ' · ${selectedInterest.ownerName}' : ''}'
                                                '${selectedInterest.ownerPhone != null ? ' · ${displayPhone(selectedInterest.ownerPhone!)}' : ''}.'
                                            : 'Closed without selecting a provider.',
                                        style: const TextStyle(fontSize: 12, color: AppColors.inkSoft, height: 1.4),
                                      ),
                                      const SizedBox(height: 10),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: _DateChip(
                                              label: 'Posted',
                                              value: formatDateTime(job.createdAt),
                                              soft: AppColors.blueSoft,
                                              ink: AppColors.blueDeep,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: _DateChip(
                                              label: 'Closed',
                                              value: formatDateTime(job.updatedAt ?? job.createdAt),
                                              soft: AppColors.greenSoft,
                                              ink: AppColors.greenDeep,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(height: 18),
                              Text(
                                'Interested providers',
                                style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 10),
                              if (_interests.isEmpty)
                                const EmptyState(
                                  icon: Icons.groups_outlined,
                                  title: 'No interest yet',
                                  message: 'Providers nearby will see your post and can send interest here.',
                                  iconColor: AppColors.indigo,
                                  iconBackground: AppColors.indigoSoft,
                                  padding: EdgeInsets.symmetric(vertical: 20, horizontal: 12),
                                )
                              else
                                for (final i in _interests)
                                  if (i.businessName != null)
                                    _InterestCard(
                                      interest: i,
                                      job: job,
                                      onCall: () => _call(i.ownerPhone, i.ownerName ?? i.businessName!),
                                      onDealFinal: () => _openDealFinal(i),
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
            Text(
              value,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: monoStyle(fontSize: 12),
            ),
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

class _StatusToggle extends StatelessWidget {
  const _StatusToggle({
    required this.label,
    required this.active,
    required this.onTap,
    required this.openStyle,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;
  final bool openStyle;

  @override
  Widget build(BuildContext context) {
    final bg = !active
        ? AppColors.surface
        : openStyle
            ? AppColors.greenSoft
            : AppColors.ink;
    final fg = !active
        ? AppColors.inkSoft
        : openStyle
            ? AppColors.greenDeep
            : Colors.white;
    final border = !active
        ? AppColors.line
        : openStyle
            ? AppColors.greenDeep
            : AppColors.ink;
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: border),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: fg),
          ),
        ),
      ),
    );
  }
}

class _DateChip extends StatelessWidget {
  const _DateChip({
    required this.label,
    required this.value,
    required this.soft,
    required this.ink,
  });

  final String label;
  final String value;
  final Color soft;
  final Color ink;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(color: soft, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 0.4, color: ink),
          ),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: ink, height: 1.3)),
        ],
      ),
    );
  }
}

class _InterestCard extends StatelessWidget {
  const _InterestCard({
    required this.interest,
    required this.job,
    required this.onCall,
    required this.onDealFinal,
  });

  final JobInterest interest;
  final Job job;
  final VoidCallback onCall;
  final VoidCallback onDealFinal;

  @override
  Widget build(BuildContext context) {
    final isSelected =
        job.closedWithBusinessId != null && interest.businessId == job.closedWithBusinessId;
    final isClosedOut = job.status == 'closed' && !isSelected;
    final badge = isSelected
        ? ('DEAL FINAL', AppColors.greenDeep)
        : isClosedOut
            ? ('NOT SELECTED', AppColors.inkFaint)
            : ('NEAR YOU', AppColors.ink);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(14, 16, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isSelected ? AppColors.greenDeep : AppColors.line),
        boxShadow: AppColors.cardShadow,
      ),
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: Transform.translate(
              offset: const Offset(0, -22),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: badge.$2, borderRadius: BorderRadius.circular(100)),
                child: Text(
                  badge.$1,
                  style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ),
          Transform.translate(
            offset: const Offset(0, -10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AvatarBadge(
                  label: initials(interest.businessName),
                  size: 48,
                  radius: 15,
                  background: AppColors.blueSoft,
                  foreground: AppColors.blueDeep,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        interest.businessName!,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, height: 1.3),
                      ),
                      if ((interest.categoryName ?? '').isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.blueSoft,
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: Text(
                            interest.categoryName!,
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                          ),
                        ),
                      ],
                      const SizedBox(height: 6),
                      Text(
                        (interest.ownerName ?? '').trim().isEmpty ? 'Provider' : interest.ownerName!,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      if ((interest.ownerPhone ?? '').isNotEmpty)
                        Text(
                          displayPhone(interest.ownerPhone!),
                          style: monoStyle(fontSize: 11.5, color: AppColors.blueDeep),
                        )
                      else
                        const Text('No contact shared', style: TextStyle(fontSize: 11, color: AppColors.inkFaint)),
                      const SizedBox(height: 6),
                      Text.rich(
                        TextSpan(
                          style: const TextStyle(fontSize: 11.5, color: AppColors.inkSoft),
                          children: [
                            if (interest.offeredAmount != null) ...[
                              const TextSpan(text: 'Offered '),
                              TextSpan(
                                text: '₹${interest.offeredAmount}',
                                style: currencyStyle(fontSize: 11.5),
                              ),
                              const TextSpan(text: ' · '),
                            ],
                            TextSpan(text: '${(interest.businessRating ?? 0).toStringAsFixed(1)} ★'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: onCall,
                  icon: Icon(
                    Icons.phone_rounded,
                    color: (interest.ownerPhone ?? '').isNotEmpty ? AppColors.blueDeep : AppColors.inkFaint,
                  ),
                ),
              ],
            ),
          ),
          if (isSelected) ...[
            Row(
              children: [
                Expanded(
                  child: _DateChip(
                    label: 'Posted',
                    value: formatDateTime(job.createdAt),
                    soft: AppColors.blueSoft,
                    ink: AppColors.blueDeep,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _DateChip(
                    label: 'Closed',
                    value: formatDateTime(job.updatedAt ?? job.createdAt),
                    soft: AppColors.greenSoft,
                    ink: AppColors.greenDeep,
                  ),
                ),
              ],
            ),
          ],
          if (job.status == 'open' && interest.status == 'waiting') ...[
            const SizedBox(height: 4),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onDealFinal,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.greenDeep,
                  side: const BorderSide(color: AppColors.greenDeep, width: 1.5),
                  backgroundColor: AppColors.greenSoft,
                  minimumSize: const Size.fromHeight(44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Deal final', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
