import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers.dart';
import '../../theme/app_theme.dart';
import '../../utils/errors.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/locality_picker.dart';
import '../../widgets/area_picker.dart';
import '../../services/postal.dart';
import '../../services/location.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _pincode = TextEditingController();
  final _address = TextEditingController();
  String? _locality;
  String? _areaId;
  String? _areaName;
  bool _areaRequired = false;
  bool _hasBusiness = false;
  bool _loading = false;
  bool _ready = false;
  bool _fetchingAddress = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    setState(() {
      _ready = false;
      _loadError = null;
    });
    try {
      final repo = ref.read(repoProvider);
      final p = await repo.fetchProfile();
      final biz = await repo.fetchMyBusiness();
      if (!mounted) return;
      _name.text = p?.fullName ?? '';
      _email.text = p?.email ?? '';
      if (p?.phone != null && p!.phone!.isNotEmpty) {
        _phone.text = digitsFromPhone(p.phone!);
      }
      _pincode.text = p?.pincode ?? '';
      _address.text = p?.address ?? '';
      _locality = p?.locality;
      _areaId = p?.areaId;
      _areaName = p?.area;
      setState(() {
        _hasBusiness = biz != null;
        _ready = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = friendlyError(e);
        _ready = true;
      });
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _pincode.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _refreshAddress() async {
    if (_fetchingAddress) return;
    setState(() => _fetchingAddress = true);
    try {
      final loc = await LocationService.instance.fetchCurrentLocation(forceRefresh: true);
      if (!mounted) return;
      if (loc == null || loc.address.isEmpty) {
        if (_address.text.trim().isNotEmpty) {
          showAppSnack(context, 'Couldn’t refresh — keeping the address we already have');
        } else {
          showAppSnack(context, 'Could not fetch your current address');
        }
      } else {
        setState(() {
          _address.text = loc.address;
          if (loc.pincode != null && _pincode.text.trim().length != 6) {
            _pincode.text = loc.pincode!;
            _locality = null;
            _areaId = null;
            _areaName = null;
          }
        });
        showAppSnack(context, 'Address updated from your location');
      }
    } catch (_) {
      if (!mounted) return;
      if (_address.text.trim().isNotEmpty) {
        showAppSnack(context, 'Couldn’t refresh — keeping the address we already have');
      } else {
        showAppErrorSnack(context, 'Could not fetch your current address');
      }
    } finally {
      if (mounted) setState(() => _fetchingAddress = false);
    }
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      if (_pincode.text.trim().length != 6) throw Exception('Enter a valid 6-digit pincode');
      if ((_locality ?? '').isEmpty) throw Exception('Select your locality');
      await assertAreaIfRequired(_pincode.text.trim(), _locality!, _areaId);
      if (_areaRequired && (_areaId ?? '').isEmpty) throw Exception('Select your area / colony');

      String? phoneValue;
      final digits = digitsFromPhone(_phone.text);
      if (_hasBusiness || digits.isNotEmpty) {
        phoneValue = normalizePhone(digits);
        if (phoneValue == null) throw Exception('Enter a valid 10-digit Indian mobile number');
      }

      await ref.read(repoProvider).updateProfile({
        'full_name': _name.text.trim(),
        if (phoneValue != null) 'phone': phoneValue,
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
      showAppErrorSnack(context, e);
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
            : _loadError != null
                ? Column(
                    children: [
                      ScreenTopBar(
                        title: 'Edit profile',
                        showBack: true,
                        onBack: () => context.pop(),
                      ),
                      Expanded(
                        child: EmptyState(
                          icon: Icons.cloud_off_outlined,
                          title: 'Could not load profile',
                          message: _loadError!,
                          iconColor: AppColors.rose,
                          iconBackground: AppColors.roseSoft,
                          action: PrimaryButton(label: 'Try again', onPressed: _boot),
                        ),
                      ),
                    ],
                  )
                : Column(
                children: [
                  ScreenTopBar(
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
                        const FieldLabel('Email'),
                        TextField(
                          controller: _email,
                          readOnly: true,
                          enabled: false,
                          decoration: const InputDecoration(hintText: 'you@example.com'),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Email is used to sign in and can’t be changed here.',
                          style: TextStyle(fontSize: 11, color: AppColors.inkFaint),
                        ),
                        const SizedBox(height: 12),
                        FieldLabel(_hasBusiness ? 'Mobile number *' : 'Mobile number'),
                        PhoneInputBox(controller: _phone),
                        const SizedBox(height: 6),
                        Text(
                          _hasBusiness
                              ? 'Required for your business listing so customers can call you.'
                              : 'Optional for customers. Required when you list a business.',
                          style: const TextStyle(fontSize: 11, color: AppColors.inkFaint),
                        ),
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
                        Row(
                          children: [
                            const Expanded(child: FieldLabel('Address / Landmark')),
                            IconButton(
                              tooltip: 'Fetch latest address',
                              onPressed: _fetchingAddress ? null : _refreshAddress,
                              icon: _fetchingAddress
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.blueDeep),
                                    )
                                  : const Icon(Icons.refresh_rounded, color: AppColors.blueDeep),
                            ),
                          ],
                        ),
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
