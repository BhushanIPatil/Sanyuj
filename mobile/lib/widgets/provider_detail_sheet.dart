import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/models.dart';
import '../services/repository.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';
import 'common.dart';

Future<void> showProviderDetailSheet(
  BuildContext context, {
  required Business business,
  required SanyujRepository repo,
  required Future<void> Function(Business) onCall,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => DraggableScrollableSheet(
      initialChildSize: 0.68,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (_, scrollController) => _ProviderDetailSheet(
        business: business,
        repo: repo,
        scrollController: scrollController,
        onCall: onCall,
      ),
    ),
  );
}

class _ProviderDetailSheet extends StatefulWidget {
  const _ProviderDetailSheet({
    required this.business,
    required this.repo,
    required this.scrollController,
    required this.onCall,
  });

  final Business business;
  final SanyujRepository repo;
  final ScrollController scrollController;
  final Future<void> Function(Business) onCall;

  @override
  State<_ProviderDetailSheet> createState() => _ProviderDetailSheetState();
}

class _ProviderDetailSheetState extends State<_ProviderDetailSheet> {
  List<ServiceAreaGroup> _coverage = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final rows = await widget.repo.fetchBusinessCoverage(widget.business.id);
      if (!mounted) return;
      setState(() {
        _coverage = groupServiceAreas(rows);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.business;
    final provider = (b.providerName ?? '').trim();
    final phone = (b.phone ?? '').trim();
    final address = (b.address ?? '').trim();

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.bgApp,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(color: Color(0x26000000), blurRadius: 24, offset: Offset(0, -4)),
        ],
      ),
      child: Column(
        children: [
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.line,
              borderRadius: BorderRadius.circular(100),
            ),
          ),
          Expanded(
            child: ListView(
              controller: widget.scrollController,
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AvatarBadge(
                      label: initials(b.name),
                      imageUrl: b.photoUrl,
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
                            b.name,
                            style: GoogleFonts.nunito(fontSize: 19, fontWeight: FontWeight.w800, height: 1.25),
                          ),
                          if ((b.category?.name ?? '').isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.blueSoft,
                                borderRadius: BorderRadius.circular(100),
                              ),
                              child: Text(
                                '${b.category?.emoji ?? ''} ${b.category!.name}'.trim(),
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.blueDeep,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _DetailTile(
                  icon: Icons.person_outline_rounded,
                  label: 'Provider',
                  value: provider.isEmpty ? 'Not shared' : provider,
                ),
                const SizedBox(height: 10),
                _DetailTile(
                  icon: Icons.phone_outlined,
                  label: 'Contact',
                  value: phone.isEmpty ? 'No contact shared' : displayPhone(phone),
                  mono: phone.isNotEmpty,
                ),
                if (address.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  _DetailTile(
                    icon: Icons.location_on_outlined,
                    label: 'Based in',
                    value: address,
                  ),
                ],
                const SizedBox(height: 22),
                Text('WHERE THEY SERVE', style: eyebrowStyle(color: AppColors.inkSoft)),
                const SizedBox(height: 10),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 18),
                    child: Center(
                      child: SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.blueDeep),
                      ),
                    ),
                  )
                else if (_coverage.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppColors.radiusMd),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: const Text(
                      'This provider has not listed their service areas yet.',
                      style: TextStyle(fontSize: 13, color: AppColors.inkSoft, height: 1.45),
                    ),
                  )
                else
                  for (final group in _coverage)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppColors.radiusMd),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.map_outlined, size: 16, color: AppColors.blueDeep),
                                const SizedBox(width: 8),
                                Text(group.pincode, style: monoStyle(fontSize: 13, color: AppColors.ink)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              group.summary,
                              style: const TextStyle(fontSize: 12.5, color: AppColors.inkSoft, height: 1.45),
                            ),
                          ],
                        ),
                      ),
                    ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () async {
                      Navigator.pop(context);
                      await widget.onCall(b);
                    },
                    icon: const Icon(Icons.call_rounded, size: 18),
                    label: Text(
                      'Call provider',
                      style: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 15),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.blueDeep,
                      minimumSize: const Size.fromHeight(50),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppColors.radiusMd),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailTile extends StatelessWidget {
  const _DetailTile({
    required this.icon,
    required this.label,
    required this.value,
    this.mono = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(11),
          ),
          child: Icon(icon, size: 16, color: AppColors.blueDeep),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: const TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.4,
                  color: AppColors.inkFaint,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                value,
                style: mono
                    ? monoStyle(fontSize: 13, color: AppColors.blueDeep)
                    : const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, height: 1.4),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class ServiceAreaGroup {
  ServiceAreaGroup({required this.pincode, required this.summary});

  final String pincode;
  final String summary;
}

/// Turns raw `business_service_areas` rows into one readable line per pincode.
List<ServiceAreaGroup> groupServiceAreas(List<Map<String, dynamic>> rows) {
  final byPincode = <String, List<Map<String, dynamic>>>{};
  for (final row in rows) {
    final pin = (row['pincode'] as String? ?? '').trim();
    if (pin.isEmpty) continue;
    byPincode.putIfAbsent(pin, () => []).add(row);
  }

  final pincodes = byPincode.keys.toList()..sort();
  return pincodes.map((pin) {
    final group = byPincode[pin]!;
    if (group.any((r) => r['locality_id'] == null && r['area_id'] == null)) {
      return ServiceAreaGroup(pincode: pin, summary: 'Entire pincode');
    }

    final byLocality = <String, Set<String>>{};
    for (final row in group) {
      final loc = row['localities'];
      final area = row['areas'];
      final locName = loc is Map ? (loc['name'] as String? ?? '') : '';
      if (locName.isEmpty) continue;
      final areas = byLocality.putIfAbsent(locName, () => <String>{});
      final areaName = area is Map ? (area['name'] as String? ?? '') : '';
      if (areaName.isNotEmpty) areas.add(areaName);
    }

    final parts = byLocality.entries.map((entry) {
      if (entry.value.isEmpty) return '${entry.key} (all areas)';
      final areas = entry.value.toList()..sort();
      return '${entry.key}: ${areas.join(', ')}';
    }).toList()
      ..sort();

    return ServiceAreaGroup(
      pincode: pin,
      summary: parts.isEmpty ? 'Entire pincode' : parts.join(' · '),
    );
  }).toList();
}
