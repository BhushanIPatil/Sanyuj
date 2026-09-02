import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/locality_picker.dart';
import '../../widgets/area_picker.dart';
import '../../services/postal.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _name = TextEditingController();
  final _pincode = TextEditingController();
  final _address = TextEditingController();
  String? _locality;
  String? _areaId;
  String? _areaName;
  bool _areaRequired = false;
  bool _loading = false;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final p = await ref.read(repoProvider).fetchProfile();
    if (!mounted) return;
    _name.text = p?.fullName ?? '';
    _pincode.text = p?.pincode ?? '';
    _address.text = p?.address ?? '';
    _locality = p?.locality;
    _areaId = p?.areaId;
    _areaName = p?.area;
    setState(() => _ready = true);
  }

  @override
  void dispose() {
    _name.dispose();
    _pincode.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      if (_pincode.text.trim().length != 6) throw Exception('Enter a valid 6-digit pincode');
      if ((_locality ?? '').isEmpty) throw Exception('Select your locality');
      await assertAreaIfRequired(_pincode.text.trim(), _locality!, _areaId);
      if (_areaRequired && (_areaId ?? '').isEmpty) throw Exception('Select your area / colony');
      await ref.read(repoProvider).updateProfile({
        'full_name': _name.text.trim(),
        'pincode': _pincode.text.trim(),
        'locality': _locality,
        'area_id': _areaId,
        'area': _areaName,
        'address': _address.text.trim(),
      });
      if (!mounted) return;
      showAppSnack(context, 'Profile updated');
      context.pop();
    } catch (e) {
      if (!mounted) return;
      showAppSnack(context, e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        child: !_ready
            ? const Center(child: CircularProgressIndicator(color: AppColors.blueDeep))
            : Column(
                children: [
                  ScreenTopBar(
                    eyebrow: 'Account',
                    title: 'Edit profile',
                    showBack: true,
                    onBack: () => context.pop(),
                  ),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
                      children: [
                        const FieldLabel('Full name'),
                        TextField(controller: _name, decoration: const InputDecoration(hintText: 'Priya Deshmukh')),
                        const SizedBox(height: 12),
                        const FieldLabel('Pincode'),
                        TextField(
                          controller: _pincode,
                          maxLength: 6,
                          keyboardType: TextInputType.number,
                          onChanged: (_) => setState(() {
                            _locality = null;
                            _areaId = null;
                            _areaName = null;
                          }),
                          style: monoStyle(fontSize: 16, letterSpacing: 0.8),
                          decoration: const InputDecoration(hintText: '425001', counterText: ''),
                        ),
                        LocalityPicker(
                          pincode: _pincode.text.trim(),
                          value: _locality,
                          onChanged: (v) => setState(() {
                            _locality = v;
                            _areaId = null;
                            _areaName = null;
                          }),
                        ),
                        AreaPicker(
                          pincode: _pincode.text.trim(),
                          locality: _locality,
                          value: _areaId,
                          onChanged: (id, name) => setState(() {
                            _areaId = id;
                            _areaName = name;
                          }),
                          onAvailabilityChange: (has) => setState(() => _areaRequired = has),
                        ),
                        const SizedBox(height: 12),
                        const FieldLabel('Address / Landmark'),
                        TextField(
                          controller: _address,
                          maxLines: 3,
                          decoration: const InputDecoration(hintText: 'House no., street, landmark'),
                        ),
                        const SizedBox(height: 24),
                        PrimaryButton(
                          label: 'Save changes',
                          loading: _loading,
                          onPressed: _pincode.text.trim().length == 6 &&
                                  (_locality ?? '').isNotEmpty &&
                                  (!_areaRequired || (_areaId ?? '').isNotEmpty)
                              ? _save
                              : null,
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
