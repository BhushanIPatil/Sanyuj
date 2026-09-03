import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers.dart';
import '../../models/models.dart';
import '../../utils/errors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/locality_picker.dart';
import '../../widgets/area_picker.dart';
import '../../services/postal.dart';

class PostJobScreen extends ConsumerStatefulWidget {
  const PostJobScreen({super.key, this.jobId});

  final String? jobId;

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
  String? _areaId;
  String? _areaName;
  bool _areaRequired = false;
  bool _loading = false;
  bool _ready = false;
  String? _loadError;

  bool get _isEdit => (widget.jobId ?? '').isNotEmpty;

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
      final profile = await repo.fetchProfile();
      final groups = await repo.fetchCategoryTree();
      Job? existing;
      if (_isEdit) {
        existing = await repo.fetchJob(widget.jobId!);
      }
      if (!mounted) return;
      setState(() {
        _groups = groups;
        if (existing != null) {
          _description.text = existing.description;
          _budgetMin.text = existing.budgetMin?.toString() ?? '';
          _budgetMax.text = existing.budgetMax?.toString() ?? '';
          _categoryId = existing.category?.id;
          _urgency = existing.urgency ?? 'today';
          _pincode = existing.pincode;
          _locality = existing.locality;
          _areaId = existing.areaId;
          _areaName = existing.area;
        } else {
          _pincode = profile?.pincode;
          _locality = profile?.locality;
          _areaId = profile?.areaId;
          _areaName = profile?.area;
          _categoryId = groups.isNotEmpty && groups.first.categories.isNotEmpty
              ? groups.first.categories.first.id
              : null;
        }
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
      await assertAreaIfRequired(_pincode!, _locality!, _areaId);
      if (_areaRequired && (_areaId ?? '').isEmpty) throw Exception('Select an area / colony for this job');
      if (_description.text.trim().isEmpty) throw Exception('Describe what you need');
      if (_categoryId == null) throw Exception('Select a category');
      final cats = _groups.expand((g) => g.categories);
      final catName = cats.firstWhere((c) => c.id == _categoryId).name;
      final title = _description.text.trim().split(RegExp(r'[.!\n]')).first;
      final resolvedTitle = title.isEmpty ? '$catName request' : title.substring(0, title.length.clamp(0, 80));
      final repo = ref.read(repoProvider);
      if (_isEdit) {
        await repo.updateJob(
          jobId: widget.jobId!,
          categoryId: _categoryId!,
          title: resolvedTitle,
          description: _description.text.trim(),
          pincode: _pincode!,
          locality: _locality!,
          areaId: _areaId,
          area: _areaName,
          urgency: _urgency,
          budgetMin: int.tryParse(_budgetMin.text),
          budgetMax: int.tryParse(_budgetMax.text),
        );
      } else {
        await repo.postJob(
          categoryId: _categoryId!,
          title: resolvedTitle,
          description: _description.text.trim(),
          pincode: _pincode!,
          locality: _locality!,
          areaId: _areaId,
          area: _areaName,
          urgency: _urgency,
          budgetMin: int.tryParse(_budgetMin.text),
          budgetMax: int.tryParse(_budgetMax.text),
        );
      }
      if (!mounted) return;
      showAppSnack(context, _isEdit ? 'Job updated' : 'Job posted');
      ref.read(myJobsRefreshTickProvider.notifier).state++;
      if (_isEdit && context.canPop()) {
        context.pop(true);
      } else {
        context.go('/my-jobs');
      }
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
                        title: _isEdit ? 'Edit Job' : 'Post a Job',
                        showBack: true,
                        onBack: () => context.pop(),
                      ),
                      Expanded(
                        child: EmptyState(
                          icon: Icons.cloud_off_outlined,
                          title: 'Could not load job form',
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
                    title: _isEdit ? 'Edit Job' : 'Post a Job',
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
                                label: c.name,
                                iconValue: c.emoji,
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
                                    Text('₹', style: currencyStyle(fontSize: 15, color: AppColors.greenDeep)),
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
                                    Text('₹', style: currencyStyle(fontSize: 15, color: AppColors.greenDeep)),
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
                        const FieldLabel('Location (Pincode)'),
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
                            decoration: const InputDecoration(hintText: 'Pincode from your profile'),
                          ),
                          const SizedBox(height: 8),
                          LocalityPicker(
                            pincode: _pincode!,
                            value: _locality,
                            onChanged: (v) => setState(() {
                              _locality = v;
                              _areaId = null;
                              _areaName = null;
                            }),
                          ),
                          AreaPicker(
                            pincode: _pincode!,
                            locality: _locality,
                            value: _areaId,
                            onChanged: (id, name) => setState(() {
                              _areaId = id;
                              _areaName = name;
                            }),
                            onAvailabilityChange: (has) => setState(() => _areaRequired = has),
                          ),
                        ],
                        const SizedBox(height: 24),
                        PrimaryButton(
                          label: _isEdit ? 'Save changes' : 'Post Job to nearby providers',
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
