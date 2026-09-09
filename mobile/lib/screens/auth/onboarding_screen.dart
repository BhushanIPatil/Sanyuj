import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../providers.dart';
import '../../services/location.dart';
import '../../services/postal.dart';
import '../../services/push_notifications.dart';
import '../../theme/app_theme.dart';
import '../../utils/errors.dart';
import '../../utils/format.dart';
import '../../widgets/area_picker.dart';
import '../../widgets/common.dart';
import '../../widgets/locality_picker.dart';

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
  final _nameFocus = FocusNode();
  String? _locality;
  String? _areaId;
  String? _areaName;
  bool _areaRequired = false;
  bool _loading = false;
  bool _leaving = false;
  bool _locating = false;
  String? _error;
  String? _locationNote;
  double? _lat;
  double? _lng;

  String get _firstName {
    final parts = _name.text.trim().split(RegExp(r'\s+'));
    return parts.isEmpty ? '' : parts.first;
  }

  bool get _locationReady => _lat != null && _address.text.trim().isNotEmpty;

  bool get _canFinish =>
      _pincode.text.trim().length == 6 &&
      (_locality ?? '').isNotEmpty &&
      (!_areaRequired || (_areaId ?? '').isNotEmpty) &&
      _address.text.trim().isNotEmpty;

  @override
  void dispose() {
    _name.dispose();
    _pincode.dispose();
    _address.dispose();
    _nameFocus.dispose();
    super.dispose();
  }

  void _goToLocation() {
    if (_name.text.trim().isEmpty) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _step = 2;
      _error = null;
    });
    _detectLocation();
  }

  void _goToNameStep() {
    FocusScope.of(context).unfocus();
    setState(() {
      _step = 1;
      _error = null;
    });
    _nameFocus.requestFocus();
  }

  Future<void> _goToLogin() async {
    if (_loading || _leaving) return;
    FocusScope.of(context).unfocus();
    setState(() => _leaving = true);
    try {
      await PushNotifications.deactivateCurrentDevice();
      await Supabase.instance.client.auth.signOut();
      if (!mounted) return;
      context.go('/login');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _leaving = false;
        _error = friendlyError(e);
      });
    }
  }

  void _onBack() {
    if (_step == 2) {
      _goToNameStep();
    } else {
      _goToLogin();
    }
  }

  Future<void> _detectLocation({bool refresh = false}) async {
    if (_locating) return;
    final hadAddress = _address.text.trim().isNotEmpty;
    setState(() {
      _locating = true;
      _error = null;
      _locationNote = null;
    });
    try {
      final loc = await LocationService.instance.fetchCurrentLocation(forceRefresh: refresh);
      if (!mounted) return;
      if (loc == null || loc.address.isEmpty) {
        setState(() {
          _locating = false;
          _locationNote = hadAddress ? 'Couldn’t update location.' : 'Couldn’t find you. Enter pincode and address.';
        });
        return;
      }
      setState(() {
        _address.text = loc.address;
        _lat = loc.lat;
        _lng = loc.lng;
        _locating = false;
        if (loc.pincode != null) {
          final pinChanged = _pincode.text.trim() != loc.pincode;
          _pincode.text = loc.pincode!;
          if (pinChanged) {
            _locality = null;
            _areaId = null;
            _areaName = null;
          }
          _locationNote = null;
        } else {
          _locationNote = 'Enter your 6-digit pincode.';
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _locating = false;
        if (hadAddress) {
          _error = null;
          _locationNote = 'Couldn’t update location.';
        } else {
          _locationNote = null;
          _error = friendlyError(e);
        }
      });
    }
  }

  void _onPincodeChanged(String value) {
    final pin = value.replaceAll(RegExp(r'\D'), '');
    final clipped = pin.length > 6 ? pin.substring(0, 6) : pin;
    if (clipped != value) {
      _pincode.value = TextEditingValue(
        text: clipped,
        selection: TextSelection.collapsed(offset: clipped.length),
      );
    }
    setState(() {
      _locality = null;
      _areaId = null;
      _areaName = null;
    });
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
        if (_lat != null) 'lat': _lat,
        if (_lng != null) 'lng': _lng,
        'onboarding_complete': true,
      });
      if (!mounted) return;
      context.go('/home');
    } catch (e) {
      setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _onBack();
      },
      child: Scaffold(
        backgroundColor: AppColors.bgApp,
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _topBar(),
                    const SizedBox(height: 22),
                    Expanded(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 280),
                        switchInCurve: Curves.easeOutCubic,
                        switchOutCurve: Curves.easeInCubic,
                        child: _step == 1 ? _buildNameStep() : _buildLocationStep(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _topBar() {
    return Row(
      children: [
        BackIconButton(onPressed: _onBack),
        const SizedBox(width: 12),
        Expanded(child: ProgressSegments(total: 2, done: _step)),
      ],
    );
  }

  Widget _buildNameStep() {
    final empty = _name.text.trim().isEmpty;
    return Column(
      key: const ValueKey('name'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('YOUR NAME', style: eyebrowStyle(color: AppColors.greenDeep)),
        const SizedBox(height: 8),
        Text(
          'Nice to meet you',
          style: GoogleFonts.nunito(fontSize: 26, fontWeight: FontWeight.w800, height: 1.15),
        ),
        const SizedBox(height: 8),
        const Text(
          'This is how neighbours will know you around Sanyuj.',
          style: TextStyle(fontSize: 14, color: AppColors.inkSoft, height: 1.5),
        ),
        Expanded(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: empty ? AppColors.blueSoft : null,
                    gradient: empty ? null : AppColors.heroGradient,
                    boxShadow: empty ? null : AppColors.ctaShadow,
                  ),
                  child: Center(
                    child: empty
                        ? const Icon(Icons.person_rounded, size: 42, color: AppColors.blueDeep)
                        : Text(
                            initials(_name.text),
                            style: GoogleFonts.nunito(
                              fontSize: 32,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 14),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: Text(
                    empty ? 'Your profile starts here' : 'Hi, $_firstName',
                    key: ValueKey(empty ? 'empty' : _firstName),
                    style: GoogleFonts.nunito(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: empty ? AppColors.inkFaint : AppColors.ink,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const FieldLabel('Full name'),
        TextField(
          controller: _name,
          focusNode: _nameFocus,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          textInputAction: TextInputAction.next,
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => _goToLocation(),
          style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w700),
          decoration: const InputDecoration(
            hintText: 'Priya Deshmukh',
            prefixIcon: Icon(Icons.badge_outlined, color: AppColors.inkFaint),
          ),
        ),
        const SizedBox(height: 20),
        PrimaryButton(
          label: 'Continue',
          onPressed: empty ? null : _goToLocation,
        ),
      ],
    );
  }

  Widget _buildLocationStep() {
    return Column(
      key: const ValueKey('location'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              Text(
                'Your neighbourhood',
                style: GoogleFonts.nunito(fontSize: 26, fontWeight: FontWeight.w800, height: 1.15),
              ),
              const SizedBox(height: 16),
              _locationCta(),
              if ((_locationNote ?? '').isNotEmpty) ...[
                const SizedBox(height: 10),
                _statusBanner(_locationNote!),
              ],
              const SizedBox(height: 20),
              const FieldLabel('Pincode'),
              TextField(
                controller: _pincode,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                onChanged: _onPincodeChanged,
                style: monoStyle(fontSize: 16, letterSpacing: 1.2),
                decoration: const InputDecoration(
                  hintText: '425001',
                  counterText: '',
                  prefixIcon: Icon(Icons.pin_drop_outlined, color: AppColors.inkFaint),
                ),
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
              const SizedBox(height: 8),
              const FieldLabel('Address / Landmark'),
              TextField(
                controller: _address,
                maxLines: 3,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: 'House no., street, landmark',
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.rose, fontWeight: FontWeight.w600)),
              ],
              const SizedBox(height: 8),
            ],
          ),
        ),
        PrimaryButton(
          label: 'Start exploring',
          loading: _loading,
          onPressed: _canFinish ? _finish : null,
        ),
      ],
    );
  }

  Widget _locationCta() {
    return Material(
      color: AppColors.blueSoft,
      borderRadius: BorderRadius.circular(AppColors.radiusMd),
      child: InkWell(
        onTap: _locating ? null : () => _detectLocation(refresh: true),
        borderRadius: BorderRadius.circular(AppColors.radiusMd),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: _locating
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.2, color: AppColors.blueDeep),
                        )
                      : Icon(
                          _locationReady ? Icons.my_location_rounded : Icons.near_me_rounded,
                          color: AppColors.blueDeep,
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _locating
                      ? 'Finding you…'
                      : _locationReady
                          ? 'Update location'
                          : 'Use current location',
                  style: GoogleFonts.nunito(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    color: AppColors.blueDeep,
                  ),
                ),
              ),
              Icon(
                _locationReady ? Icons.refresh_rounded : Icons.chevron_right_rounded,
                color: AppColors.blueDeep,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusBanner(String note) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 10, 14, 10),
      decoration: BoxDecoration(
        color: AppColors.amberSoft,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline_rounded, size: 18, color: AppColors.amber),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              note,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.amber, height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}
