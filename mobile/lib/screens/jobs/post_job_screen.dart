import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/locality_picker.dart';

class PostJobScreen extends ConsumerStatefulWidget {
  const PostJobScreen({super.key});

  @override
  ConsumerState<PostJobScreen> createState() => _PostJobScreenState();
}

class _PostJobScreenState extends ConsumerState<PostJobScreen> {
  final _description = TextEditingController();
  final _budgetMin = TextEditingController(text: '400');
  final _budgetMax = TextEditingController(text: '600');
  List<CategoryGroup> _groups = [];
  String? _categoryId;
  String _urgency = 'today';
  String? _pincode;
  String? _locality;
  bool _loading = false;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final repo = ref.read(repoProvider);
    final profile = await repo.fetchProfile();
    final groups = await repo.fetchCategoryTree();
    if (!mounted) return;
    setState(() {
      _pincode = profile?.pincode;
      _locality = profile?.locality;
      _groups = groups;
      _categoryId = groups.isNotEmpty && groups.first.categories.isNotEmpty
          ? groups.first.categories.first.id
          : null;
      _ready = true;
    });
  }

  @override
  void dispose() {
    _description.dispose();
    _budgetMin.dispose();
    _budgetMax.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      if ((_pincode ?? '').isEmpty) throw Exception('Set your pincode in profile first');
      if ((_locality ?? '').isEmpty) throw Exception('Select a locality for this job');
      if (_description.text.trim().isEmpty) throw Exception('Describe what you need');
      if (_categoryId == null) throw Exception('Select a category');
      final cats = _groups.expand((g) => g.categories);
      final catName = cats.firstWhere((c) => c.id == _categoryId).name;
      final title = _description.text.trim().split(RegExp(r'[.!\n]')).first;
      await ref.read(repoProvider).postJob(
            categoryId: _categoryId!,
            title: title.isEmpty ? '$catName request' : title.substring(0, title.length.clamp(0, 80)),
            description: _description.text.trim(),
            pincode: _pincode!,
            locality: _locality!,
            urgency: _urgency,
            budgetMin: int.tryParse(_budgetMin.text),
            budgetMax: int.tryParse(_budgetMax.text),
          );
      if (!mounted) return;
      showAppSnack(context, 'Job posted');
      context.go('/my-jobs');
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
                    eyebrow: 'New request',
                    title: 'Post a Job',
                    showBack: true,
                    onBack: () => context.pop(),
                  ),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
                      children: [
                        const FieldLabel('Category'),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final c in _groups.expand((g) => g.categories))
                              CategoryChipPill(
                                label: '${c.emoji ?? ''} ${c.name}'.trim(),
                                selected: _categoryId == c.id,
                                onTap: () => setState(() => _categoryId = c.id),
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const FieldLabel('What do you need done?'),
                        TextField(
                          controller: _description,
                          maxLines: 4,
                          decoration: const InputDecoration(
                            hintText: 'Need a plumber to fix a leaking tap today…',
                          ),
                        ),
                        const SizedBox(height: 12),
                        const FieldLabel('Expected amount'),
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(AppColors.radiusMd),
                                  border: Border.all(color: AppColors.line, width: 1.5),
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                                child: Row(
                                  children: [
                                    Text('₹', style: monoStyle(fontSize: 15, color: AppColors.greenDeep)),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: TextField(
                                        controller: _budgetMin,
                                        keyboardType: TextInputType.number,
                                        style: monoStyle(fontSize: 15),
                                        decoration: const InputDecoration(
                                          hintText: 'Min',
                                          border: InputBorder.none,
                                          enabledBorder: InputBorder.none,
                                          focusedBorder: InputBorder.none,
                                          filled: false,
                                          contentPadding: EdgeInsets.symmetric(vertical: 12),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 8),
                              child: Text('–', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.inkSoft)),
                            ),
                            Expanded(
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(AppColors.radiusMd),
                                  border: Border.all(color: AppColors.line, width: 1.5),
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                                child: Row(
                                  children: [
                                    Text('₹', style: monoStyle(fontSize: 15, color: AppColors.greenDeep)),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: TextField(
                                        controller: _budgetMax,
                                        keyboardType: TextInputType.number,
                                        style: monoStyle(fontSize: 15),
                                        decoration: const InputDecoration(
                                          hintText: 'Max',
                                          border: InputBorder.none,
                                          enabledBorder: InputBorder.none,
                                          focusedBorder: InputBorder.none,
                                          filled: false,
                                          contentPadding: EdgeInsets.symmetric(vertical: 12),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const FieldLabel('When do you need this?'),
                        Row(
                          children: [
                            UrgencyChip(
                              label: 'Today',
                              selected: _urgency == 'today',
                              onTap: () => setState(() => _urgency = 'today'),
                            ),
                            const SizedBox(width: 8),
                            UrgencyChip(
                              label: 'This week',
                              selected: _urgency == 'this_week',
                              onTap: () => setState(() => _urgency = 'this_week'),
                            ),
                            const SizedBox(width: 8),
                            UrgencyChip(
                              label: 'Flexible',
                              selected: _urgency == 'flexible',
                              onTap: () => setState(() => _urgency = 'flexible'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const FieldLabel('Location'),
                        if (_pincode == null || _pincode!.isEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: AppColors.cyanSoft,
                              borderRadius: BorderRadius.circular(AppColors.radiusMd),
                            ),
                            child: const Text(
                              'Set your pincode in profile first',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
                            ),
                          )
                        else ...[
                          TextField(
                            readOnly: true,
                            controller: TextEditingController(text: _pincode),
                            style: monoStyle(fontSize: 14),
                            decoration: const InputDecoration(labelText: 'Pincode'),
                          ),
                          const SizedBox(height: 8),
                          LocalityPicker(
                            pincode: _pincode!,
                            value: _locality,
                            onChanged: (v) => setState(() => _locality = v),
                          ),
                        ],
                        const SizedBox(height: 24),
                        PrimaryButton(
                          label: 'Post Job to nearby providers',
                          loading: _loading,
                          onPressed: _submit,
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
