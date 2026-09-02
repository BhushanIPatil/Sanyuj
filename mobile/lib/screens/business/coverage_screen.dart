import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../providers.dart';
import '../../services/postal.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';

class BusinessCoverageScreen extends ConsumerStatefulWidget {
  const BusinessCoverageScreen({super.key});

  @override
  ConsumerState<BusinessCoverageScreen> createState() => _BusinessCoverageScreenState();
}

class _BusinessCoverageScreenState extends ConsumerState<BusinessCoverageScreen> {
  String? _businessId;
  List<Map<String, dynamic>> _rows = [];
  bool _ready = false;
  bool _saving = false;
  final _newPin = TextEditingController();
  String? _editingPin;
  bool _entire = true;
  List<PostalLocality> _localities = [];
  final Set<String> _selectedLocalities = {};
  final Map<String, bool> _entireLocality = {};
  final Map<String, List<AreaOption>> _areas = {};
  final Map<String, Set<String>> _selectedAreas = {};

  @override
  void initState() {
    super.initState();
    _boot();
  }

  @override
  void dispose() {
    _newPin.dispose();
    super.dispose();
  }

  Future<void> _boot() async {
    final biz = await ref.read(repoProvider).fetchMyBusiness();
    if (!mounted) return;
    if (biz == null) {
      setState(() => _ready = true);
      return;
    }
    _businessId = biz.id;
    await _reload();
    if (mounted) setState(() => _ready = true);
  }

  Future<void> _reload() async {
    final id = _businessId;
    if (id == null) return;
    final rows = await ref.read(repoProvider).fetchBusinessCoverage(id);
    if (!mounted) return;
    setState(() => _rows = rows);
  }

  Map<String, List<Map<String, dynamic>>> get _grouped {
    final map = <String, List<Map<String, dynamic>>>{};
    for (final row in _rows) {
      final pin = row['pincode'] as String? ?? '';
      map.putIfAbsent(pin, () => []).add(row);
    }
    return map;
  }

  String _summary(List<Map<String, dynamic>> rows) {
    if (rows.any((r) => r['locality_id'] == null && r['area_id'] == null)) return 'Entire pincode';
    final bits = <String>[];
    for (final row in rows) {
      final loc = row['localities'];
      final area = row['areas'];
      if (area is Map && area['name'] != null) {
        bits.add(area['name'] as String);
      } else if (loc is Map && loc['name'] != null) {
        bits.add('${loc['name']} (all)');
      }
    }
    return bits.join(', ');
  }

  Future<void> _openEditor(String pincode, {List<Map<String, dynamic>>? existing}) async {
    setState(() {
      _editingPin = pincode;
      _entire = existing == null || existing.any((r) => r['locality_id'] == null && r['area_id'] == null);
      _selectedLocalities.clear();
      _entireLocality.clear();
      _areas.clear();
      _selectedAreas.clear();
      _localities = [];
    });
    final list = await fetchLocalitiesForPincode(pincode);
    if (!mounted) return;
    setState(() => _localities = list);
    if (existing != null && !_entire) {
      for (final row in existing) {
        final loc = row['localities'];
        final name = loc is Map ? loc['name'] as String? : null;
        if (name == null) continue;
        _selectedLocalities.add(name);
        if (row['area_id'] == null) {
          _entireLocality[name] = true;
        } else {
          _entireLocality[name] = _entireLocality[name] ?? false;
          _selectedAreas.putIfAbsent(name, () => {}).add(row['area_id'] as String);
        }
      }
      for (final name in _selectedLocalities) {
        PostalLocality? loc;
        for (final l in list) {
          if (l.name == name) {
            loc = l;
            break;
          }
        }
        if (loc?.id != null) {
          _areas[name] = await fetchAreasForLocality(loc!.id!);
        }
      }
      if (mounted) setState(() {});
    }
  }

  Future<void> _toggleLocality(String name, bool on) async {
    setState(() {
      if (on) {
        _selectedLocalities.add(name);
        _entireLocality[name] = true;
      } else {
        _selectedLocalities.remove(name);
        _entireLocality.remove(name);
        _selectedAreas.remove(name);
      }
    });
    if (!on) return;
    PostalLocality? loc;
    for (final l in _localities) {
      if (l.name == name) {
        loc = l;
        break;
      }
    }
    if (loc?.id == null) return;
    final areas = await fetchAreasForLocality(loc!.id!);
    if (!mounted) return;
    setState(() => _areas[name] = areas);
  }

  Future<void> _save() async {
    final id = _businessId;
    final pin = _editingPin;
    if (id == null || pin == null) return;
    setState(() => _saving = true);
    try {
      final items = _entire
          ? <Map<String, dynamic>>[]
          : _selectedLocalities
              .map(
                (name) => {
                  'localityName': name,
                  'entireLocality': _entireLocality[name] != false,
                  'areaIds': (_selectedAreas[name] ?? {}).toList(),
                },
              )
              .toList();
      if (!_entire && items.isEmpty) throw Exception('Select at least one locality, or cover the whole pincode');
      await ref.read(repoProvider).savePincodeCoverage(
            businessId: id,
            pincode: pin,
            entirePincode: _entire,
            items: items,
          );
      await _reload();
      if (!mounted) return;
      setState(() => _editingPin = null);
      showAppSnack(context, 'Service area saved');
    } catch (e) {
      if (!mounted) return;
      showAppSnack(context, e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const Scaffold(
        backgroundColor: AppColors.bgApp,
        body: Center(child: CircularProgressIndicator(color: AppColors.blueDeep)),
      );
    }
    if (_businessId == null) {
      return Scaffold(
        backgroundColor: AppColors.bgApp,
        body: SafeArea(
          child: Column(
            children: [
              ScreenTopBar(eyebrow: 'Business', title: 'Service areas', showBack: true, onBack: () => context.pop()),
              const Padding(
                padding: EdgeInsets.all(20),
                child: Text('Create a business profile first.', style: TextStyle(color: AppColors.inkSoft)),
              ),
            ],
          ),
        ),
      );
    }

    final grouped = _grouped;
    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        child: Column(
          children: [
            ScreenTopBar(eyebrow: 'Business', title: 'Service areas', showBack: true, onBack: () => context.pop()),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
                children: [
                  const Text(
                    'Cover a whole pincode, selected localities, or specific colonies.',
                    style: TextStyle(fontSize: 12.5, color: AppColors.inkSoft, height: 1.5),
                  ),
                  const SizedBox(height: 16),
                  if (grouped.isEmpty)
                    const Text('No service areas yet. Add a pincode below.', style: TextStyle(color: AppColors.inkSoft))
                  else
                    for (final entry in grouped.entries)
                      SoftCard(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(entry.key, style: monoStyle(fontSize: 16)),
                                  const SizedBox(height: 4),
                                  Text(_summary(entry.value), style: const TextStyle(fontSize: 12, color: AppColors.inkSoft)),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () => _openEditor(entry.key, existing: entry.value),
                              child: const Text('Edit'),
                            ),
                            TextButton(
                              onPressed: () async {
                                await ref.read(repoProvider).removePincodeCoverage(
                                      businessId: _businessId!,
                                      pincode: entry.key,
                                    );
                                await _reload();
                              },
                              child: const Text('Remove', style: TextStyle(color: AppColors.rose)),
                            ),
                          ],
                        ),
                      ),
                  const SizedBox(height: 12),
                  const FieldLabel('Add pincode'),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _newPin,
                          maxLength: 6,
                          keyboardType: TextInputType.number,
                          style: monoStyle(fontSize: 16, letterSpacing: 0.8),
                          onChanged: (_) => setState(() {}),
                          decoration: const InputDecoration(hintText: '425001', counterText: ''),
                        ),
                      ),
                      const SizedBox(width: 8),
                      TextButton(
                        onPressed: _newPin.text.trim().length != 6 ? null : () => _openEditor(_newPin.text.trim()),
                        child: const Text('Add'),
                      ),
                    ],
                  ),
                  if (_editingPin != null) ...[
                    const SizedBox(height: 16),
                    Text('Coverage for $_editingPin', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Entire pincode'),
                      value: _entire,
                      onChanged: (v) => setState(() => _entire = v ?? true),
                    ),
                    if (!_entire)
                      for (final loc in _localities)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CheckboxListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(loc.name),
                              value: _selectedLocalities.contains(loc.name),
                              onChanged: (v) => _toggleLocality(loc.name, v ?? false),
                            ),
                            if (_selectedLocalities.contains(loc.name) && (_areas[loc.name]?.isNotEmpty ?? false))
                              Padding(
                                padding: const EdgeInsets.only(left: 24),
                                child: Column(
                                  children: [
                                    CheckboxListTile(
                                      contentPadding: EdgeInsets.zero,
                                      title: const Text('Entire locality', style: TextStyle(fontSize: 13)),
                                      value: _entireLocality[loc.name] != false,
                                      onChanged: (v) => setState(() => _entireLocality[loc.name] = v ?? true),
                                    ),
                                    if (_entireLocality[loc.name] == false)
                                      for (final area in _areas[loc.name] ?? [])
                                        CheckboxListTile(
                                          contentPadding: EdgeInsets.zero,
                                          title: Text(area.name, style: const TextStyle(fontSize: 13)),
                                          value: _selectedAreas[loc.name]?.contains(area.id) ?? false,
                                          onChanged: (v) => setState(() {
                                            final set = _selectedAreas.putIfAbsent(loc.name, () => {});
                                            if (v == true) {
                                              set.add(area.id);
                                            } else {
                                              set.remove(area.id);
                                            }
                                          }),
                                        ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                    const SizedBox(height: 8),
                    PrimaryButton(label: 'Save coverage', loading: _saving, onPressed: _save),
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
