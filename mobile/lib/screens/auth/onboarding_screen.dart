import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/locality_picker.dart';
import '../../widgets/area_picker.dart';
import '../../services/postal.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _step = 1;
  final _name = TextEditingController();
  final _pincode = TextEditingController();
  final _address = TextEditingController();
  String? _locality;
  String? _areaId;
  String? _areaName;
  bool _areaRequired = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _pincode.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (_pincode.text.trim().length != 6) throw Exception('Enter a valid 6-digit pincode');
      if ((_locality ?? '').isEmpty) throw Exception('Select your locality');
      if (_address.text.trim().isEmpty) throw Exception('Enter your address');
      await assertAreaIfRequired(_pincode.text.trim(), _locality!, _areaId);
      if (_areaRequired && (_areaId ?? '').isEmpty) throw Exception('Select your area / colony');
      await ref.read(repoProvider).updateProfile({
        'full_name': _name.text.trim(),
        'pincode': _pincode.text.trim(),
        'locality': _locality,
        'area_id': _areaId,
        'area': _areaName,
        'address': _address.text.trim(),
        'onboarding_complete': true,
      });
      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgApp,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ProgressSegments(total: 2, done: _step),
                  const SizedBox(height: 26),
                  if (_step == 2) ...[
                    BackIconButton(onPressed: () => setState(() => _step = 1)),
                    const SizedBox(height: 18),
                  ],
                  Text(
                    'STEP $_step',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.greenDeep,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (_step == 1) ...[
                    Text(
                      'What should we call you?',
                      style: GoogleFonts.nunito(fontSize: 23, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Your name helps neighbours trust you.',
                      style: TextStyle(fontSize: 13.5, color: AppColors.inkSoft, height: 1.5),
                    ),
                    const SizedBox(height: 20),
                    const FieldLabel('Full name'),
                    TextField(
                      controller: _name,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(hintText: 'Priya Deshmukh'),
                    ),
                    const Spacer(),
                    PrimaryButton(
                      label: 'Continue',
                      onPressed: _name.text.trim().isEmpty ? null : () => setState(() => _step = 2),
                    ),
                  ] else ...[
                    Expanded(
                      child: ListView(
                        children: [
                          Text(
                            'Where are you located?',
                            style: GoogleFonts.nunito(fontSize: 23, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'This helps us show you help nearby, and connect you with nearby customers if you ever list a business.',
                            style: TextStyle(fontSize: 13.5, color: AppColors.inkSoft, height: 1.5),
                          ),
                          const SizedBox(height: 20),
                          const FieldLabel('Pincode'),
                          TextField(
                            controller: _pincode,
                            keyboardType: TextInputType.number,
                            maxLength: 6,
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
                          if (_error != null) ...[
                            const SizedBox(height: 12),
                            Text(_error!, style: const TextStyle(color: AppColors.rose)),
                          ],
                        ],
                      ),
                    ),
                    PrimaryButton(
                      label: 'Continue to Sanyuj',
                      loading: _loading,
                      onPressed: _pincode.text.trim().length == 6 &&
                              (_locality ?? '').isNotEmpty &&
                              (!_areaRequired || (_areaId ?? '').isNotEmpty) &&
                              _address.text.trim().isNotEmpty
                          ? _finish
                          : null,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
