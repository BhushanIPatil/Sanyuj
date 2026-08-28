import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';

class BusinessSetupScreen extends ConsumerStatefulWidget {
  const BusinessSetupScreen({super.key});

  @override
  ConsumerState<BusinessSetupScreen> createState() => _BusinessSetupScreenState();
}

class _BusinessSetupScreenState extends ConsumerState<BusinessSetupScreen> {
  final _name = TextEditingController();
  List<Category> _categories = [];
  String? _categoryId;
  bool _loading = false;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final groups = await ref.read(repoProvider).fetchCategoryTree();
    if (!mounted) return;
    final cats = groups.expand((g) => g.categories).toList();
    setState(() {
      _categories = cats;
      _categoryId = cats.isNotEmpty ? cats.first.id : null;
      _ready = true;
    });
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    setState(() => _loading = true);
    try {
      if (_name.text.trim().isEmpty) throw Exception('Enter a business name');
      if (_categoryId == null) throw Exception('Select a category');
      await ref.read(repoProvider).createBusiness(name: _name.text.trim(), categoryId: _categoryId!);
      if (!mounted) return;
      showAppSnack(context, 'Business listed');
      context.pop();
    } catch (e) {
      if (!mounted) return;
      showAppSnack(context, e.toString().replaceFirst('Exception: ', ''));
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
                    eyebrow: 'List your business',
                    title: 'Set up your business',
                    showBack: true,
                    onBack: () => context.pop(),
                  ),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
                      children: [
                        const Text(
                          'Your pincode & landmark are already saved on your account — just the essentials below.',
                          style: TextStyle(fontSize: 12.5, color: AppColors.inkSoft, height: 1.5),
                        ),
                        const SizedBox(height: 18),
                        Center(
                          child: Column(
                            children: [
                              Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  Container(
                                    width: 88,
                                    height: 88,
                                    decoration: BoxDecoration(
                                      color: AppColors.blueSoft,
                                      borderRadius: BorderRadius.circular(28),
                                      border: Border.all(color: AppColors.blueDeep, width: 2),
                                    ),
                                    child: const Icon(Icons.photo_camera_outlined, color: AppColors.blueDeep, size: 28),
                                  ),
                                  Positioned(
                                    right: -6,
                                    bottom: -6,
                                    child: Container(
                                      width: 30,
                                      height: 30,
                                      decoration: BoxDecoration(
                                        gradient: AppColors.heroGradient,
                                        borderRadius: BorderRadius.circular(11),
                                        border: Border.all(color: Colors.white, width: 3),
                                      ),
                                      child: const Icon(Icons.add, color: Colors.white, size: 14),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              const Text('Add business photo', style: TextStyle(fontSize: 12, color: AppColors.inkSoft, fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        const FieldLabel('Business name'),
                        TextField(
                          controller: _name,
                          decoration: const InputDecoration(hintText: 'e.g. Patil Plumbing Works'),
                        ),
                        const SizedBox(height: 14),
                        const FieldLabel('What service do you provide?'),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final c in _categories)
                              CategoryChipPill(
                                label: '${c.emoji ?? ''} ${c.name}'.trim(),
                                selected: _categoryId == c.id,
                                onTap: () => setState(() => _categoryId = c.id),
                              ),
                          ],
                        ),
                        const SizedBox(height: 26),
                        PrimaryButton(label: 'Create Business Profile', loading: _loading, onPressed: _create),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
