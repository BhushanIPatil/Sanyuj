import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../widgets/animated_search_hint.dart';
import '../../widgets/common.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key, this.initialCategoryId});

  final String? initialCategoryId;

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _query = TextEditingController();
  List<CategoryGroup> _groups = [];
  List<Business> _items = [];
  String? _categoryId;
  String? _pincode;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _categoryId = widget.initialCategoryId;
    _load();
  }

  @override
  void didUpdateWidget(covariant ExploreScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialCategoryId != widget.initialCategoryId) {
      setState(() => _categoryId = widget.initialCategoryId);
      _load();
    }
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final repo = ref.read(repoProvider);
      final profile = await repo.fetchProfile();
      final groups = await repo.fetchCategoryTree();
      final items = await repo.fetchBusinesses(
        categoryId: null,
        pincode: profile?.pincode,
        localityId: profile?.localityId,
        areaId: profile?.areaId,
      );
      if (!mounted) return;
      setState(() {
        _pincode = profile?.pincode;
        _groups = groups;
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAppErrorAlert(context, e, actionLabel: 'Retry', onAction: _load);
    }
  }

  Future<void> _call(Business b) async {
    final digits = b.phone?.replaceAll(RegExp(r'\D'), '') ?? '';
    if (digits.isEmpty) {
      showAppSnack(context, 'No contact for ${b.name}');
      return;
    }
    try {
      await launchUrl(Uri.parse('tel:$digits'), mode: LaunchMode.externalApplication);
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.text.trim().toLowerCase();
    final filtered = _items.where((b) {
      if (_categoryId != null && b.category?.id != _categoryId) return false;
      if (q.isEmpty) return true;
      final hay = '${b.name} ${b.category?.name ?? ''} ${b.providerName ?? ''}'.toLowerCase();
      return hay.contains(q);
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Explore providers', style: GoogleFonts.nunito(fontSize: 22, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(
                'Browse trusted local businesses near ${_pincode ?? 'your area'}.',
                style: const TextStyle(fontSize: 13, color: AppColors.inkSoft),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.line, width: 1.5),
              boxShadow: AppColors.cardShadow,
            ),
            child: Row(
              children: [
                const Icon(Icons.search_rounded, size: 18, color: AppColors.inkFaint),
                const SizedBox(width: 10),
                Expanded(
                  child: Stack(
                    alignment: Alignment.centerLeft,
                    children: [
                      if (_query.text.isEmpty)
                        const IgnorePointer(child: AnimatedSearchHint()),
                      TextField(
                        controller: _query,
                        onChanged: (_) => setState(() {}),
                        style: const TextStyle(fontSize: 13.5),
                        decoration: const InputDecoration(
                          hintText: '',
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          filled: false,
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            children: [
              FilterChipPill(
                label: 'All',
                selected: _categoryId == null,
                onTap: () => setState(() => _categoryId = null),
              ),
              const SizedBox(width: 8),
              for (final c in _groups.expand((g) => g.categories)) ...[
                FilterChipPill(
                  label: c.name,
                  selected: _categoryId == c.id,
                  onTap: () => setState(() => _categoryId = c.id),
                ),
                const SizedBox(width: 8),
              ],
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.blueDeep))
              : RefreshIndicator(
                  color: AppColors.blueDeep,
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(20, 6, 20, 100),
                    itemCount: filtered.isEmpty ? 2 : filtered.length + 1,
                    itemBuilder: (_, i) {
                      if (filtered.isEmpty && i == 0) {
                        return const EmptyState(
                          icon: Icons.storefront_outlined,
                          title: 'No providers nearby',
                          message: 'Try another category or check back later as more businesses join Sanyuj.',
                          iconColor: AppColors.indigo,
                          iconBackground: AppColors.indigoSoft,
                          padding: EdgeInsets.symmetric(vertical: 24, horizontal: 8),
                        );
                      }
                      if ((filtered.isEmpty && i == 1) || i == filtered.length) {
                        return Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Container(
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              color: AppColors.indigoSoft,
                              borderRadius: BorderRadius.circular(AppColors.radiusLg),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    'Not seeing the right fit?',
                                    style: GoogleFonts.nunito(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppColors.indigo),
                                  ),
                                ),
                                Material(
                                  color: AppColors.indigo,
                                  borderRadius: BorderRadius.circular(100),
                                  child: InkWell(
                                    onTap: () => context.push(
                                      ref.read(repoProvider).userId == null ? '/login?next=/post-job' : '/post-job',
                                    ),
                                    borderRadius: BorderRadius.circular(100),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                      child: Text(
                                        ref.read(repoProvider).userId == null ? 'Log in to post' : 'Post a Job',
                                        style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }
                      final b = filtered[i];
                      return SoftCard(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        radius: 18,
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CategoryIcon(value: b.category?.emoji, size: 44, radius: 12, fallback: '📍'),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(b.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                                  if (b.category?.name != null) ...[
                                    const SizedBox(height: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppColors.blueSoft,
                                        borderRadius: BorderRadius.circular(100),
                                      ),
                                      child: Text(
                                        b.category!.name,
                                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 6),
                                  Text(
                                    (b.providerName ?? '').trim().isEmpty ? 'Provider' : b.providerName!.trim(),
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                  ),
                                  if (b.phone != null && b.phone!.isNotEmpty)
                                    Text(displayPhone(b.phone!), style: monoStyle(fontSize: 11.5, color: AppColors.blueDeep))
                                  else
                                    const Text('No contact shared', style: TextStyle(fontSize: 11, color: AppColors.inkFaint)),
                                  const SizedBox(height: 4),
                                  Text('${b.rating.toStringAsFixed(1)} ★', style: const TextStyle(fontSize: 12, color: AppColors.inkSoft)),
                                  if ((b.address ?? '').isNotEmpty)
                                    Text(
                                      b.address!,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 11, color: AppColors.inkFaint),
                                    ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () => _call(b),
                              child: const Text('Call', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.blueDeep)),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}
