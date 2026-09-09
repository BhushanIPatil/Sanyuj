import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../utils/errors.dart';
import '../../utils/format.dart';
import '../../widgets/business_photo_picker.dart';
import '../../widgets/common.dart';

class BusinessSetupScreen extends ConsumerStatefulWidget {
  const BusinessSetupScreen({super.key});

  @override
  ConsumerState<BusinessSetupScreen> createState() => _BusinessSetupScreenState();
}

class _BusinessSetupScreenState extends ConsumerState<BusinessSetupScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  List<Category> _categories = [];
  String? _categoryId;
  Business? _business;
  String? _photoUrl;
  File? _pendingFile;
  bool _loading = false;
  bool _uploading = false;
  bool _ready = false;
  String? _loadError;

  bool get _editing => _business != null;

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
      final groups = await repo.fetchCategoryTree();
      final profile = await repo.fetchProfile();
      final business = await repo.fetchMyBusiness();
      if (!mounted) return;
      final cats = groups.expand((g) => g.categories).toList();
      if (profile?.phone != null && profile!.phone!.isNotEmpty) {
        _phone.text = digitsFromPhone(profile.phone!);
      }
      if (business != null) {
        _name.text = business.name;
        _categoryId = business.category?.id ?? (cats.isNotEmpty ? cats.first.id : null);
      } else {
        _categoryId = cats.isNotEmpty ? cats.first.id : null;
      }
      setState(() {
        _categories = cats;
        _business = business;
        _photoUrl = business?.photoUrl;
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
    _phone.dispose();
    super.dispose();
  }

  Future<void> _onPick(XFile file) async {
    if (!_editing) {
      setState(() => _pendingFile = File(file.path));
      return;
    }
    setState(() => _uploading = true);
    try {
      final repo = ref.read(repoProvider);
      final url = await repo.uploadBusinessPhoto(file, previousUrl: _photoUrl);
      await repo.setBusinessPhoto(businessId: _business!.id, photoUrl: url);
      if (!mounted) return;
      setState(() {
        _photoUrl = url;
        _pendingFile = null;
        _business = _business!.copyWith(photoUrl: url);
      });
      showAppSnack(context, 'Business photo updated');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _onRemovePhoto() async {
    if (!_editing) {
      setState(() => _pendingFile = null);
      return;
    }
    setState(() => _uploading = true);
    try {
      final repo = ref.read(repoProvider);
      await repo.removeStoredBusinessPhoto(_photoUrl);
      await repo.setBusinessPhoto(businessId: _business!.id, photoUrl: null);
      if (!mounted) return;
      setState(() {
        _photoUrl = null;
        _pendingFile = null;
        _business = _business!.copyWith(clearPhotoUrl: true);
      });
      showAppSnack(context, 'Business photo removed');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _create() async {
    setState(() => _loading = true);
    try {
      if (_name.text.trim().isEmpty) throw Exception('Enter a business name');
      if (_categoryId == null) throw Exception('Select a category');
      final phone = normalizePhone(digitsFromPhone(_phone.text));
      if (phone == null) throw Exception('Enter a valid 10-digit Indian mobile number');
      final repo = ref.read(repoProvider);
      String? photoUrl;
      if (_pendingFile != null) {
        photoUrl = await repo.uploadBusinessPhoto(XFile(_pendingFile!.path));
      }
      await repo.createBusiness(
        name: _name.text.trim(),
        categoryId: _categoryId!,
        phone: phone,
        photoUrl: photoUrl,
      );
      if (!mounted) return;
      showAppSnack(context, 'Business listed');
      context.go('/business/coverage');
    } catch (e) {
      if (!mounted) return;
      showAppErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final biz = _business;
    if (biz == null) return;
    setState(() => _loading = true);
    try {
      if (_name.text.trim().isEmpty) throw Exception('Enter a business name');
      if (_categoryId == null) throw Exception('Select a category');
      final phone = normalizePhone(digitsFromPhone(_phone.text));
      if (phone == null) throw Exception('Enter a valid 10-digit Indian mobile number');
      await ref.read(repoProvider).updateBusiness(
            id: biz.id,
            name: _name.text.trim(),
            categoryId: _categoryId!,
            phone: phone,
          );
      if (!mounted) return;
      showAppSnack(context, 'Business details saved');
      if (context.canPop()) context.pop();
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
                        title: 'Your Business',
                        showBack: true,
                        onBack: () => context.pop(),
                      ),
                      Expanded(
                        child: EmptyState(
                          icon: Icons.cloud_off_outlined,
                          title: 'Could not load business',
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
                        title: _editing ? 'Edit business' : 'Set up your business',
                        showBack: true,
                        onBack: () => context.pop(),
                      ),
                      Expanded(
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
                          children: [
                            Text(
                              _editing
                                  ? 'Update how neighbours see your listing. Customers call the mobile number on your account.'
                                  : 'Customers need a contact number to call you. Your pincode & address are already on your account.',
                              style: const TextStyle(fontSize: 12.5, color: AppColors.inkSoft, height: 1.5),
                            ),
                            const SizedBox(height: 18),
                            Center(
                              child: BusinessPhotoPicker(
                                networkUrl: _photoUrl,
                                localFile: _pendingFile,
                                uploading: _uploading,
                                onChanged: _onPick,
                                onRemove: _onRemovePhoto,
                              ),
                            ),
                            const SizedBox(height: 18),
                            const FieldLabel('Business name'),
                            TextField(
                              controller: _name,
                              decoration: const InputDecoration(hintText: 'e.g. Patil Plumbing Works'),
                            ),
                            const SizedBox(height: 14),
                            const FieldLabel('Contact mobile number *'),
                            PhoneInputBox(controller: _phone),
                            const SizedBox(height: 6),
                            const Text(
                              'Required to list as a provider. Shown to customers when they want to call you.',
                              style: TextStyle(fontSize: 11, color: AppColors.inkFaint),
                            ),
                            const SizedBox(height: 14),
                            const FieldLabel('What service do you provide?'),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final c in _categories)
                                  CategoryChipPill(
                                    label: c.name,
                                    iconValue: c.emoji,
                                    selected: _categoryId == c.id,
                                    onTap: () => setState(() => _categoryId = c.id),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 26),
                            if (_editing) ...[
                              PrimaryButton(
                                label: 'Save changes',
                                loading: _loading,
                                onPressed: _uploading ? null : _save,
                              ),
                              const SizedBox(height: 12),
                              OutlinedButton(
                                onPressed: () => context.push('/business/coverage'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.ink,
                                  side: const BorderSide(color: AppColors.line, width: 1.5),
                                  minimumSize: const Size.fromHeight(48),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                                ),
                                child: const Text('Service areas', style: TextStyle(fontWeight: FontWeight.w700)),
                              ),
                            ] else
                              PrimaryButton(
                                label: 'Create Business Profile',
                                loading: _loading,
                                onPressed: _uploading ? null : _create,
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
