import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';
import '../utils/errors.dart';
import '../utils/format.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || loading;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: disabled ? AppColors.inkFaint : AppColors.blueDeep,
        borderRadius: BorderRadius.circular(AppColors.radiusMd),
        boxShadow: disabled ? null : AppColors.ctaShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: loading ? null : onPressed,
          borderRadius: BorderRadius.circular(AppColors.radiusMd),
          child: SizedBox(
            height: 52,
            child: Center(
              child: loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                    )
                  : Text(
                      label,
                      style: GoogleFonts.nunito(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class BackIconButton extends StatelessWidget {
  const BackIconButton({super.key, this.onPressed});

  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(13),
      child: InkWell(
        onTap: onPressed ?? () => Navigator.maybePop(context),
        borderRadius: BorderRadius.circular(13),
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(13),
            border: Border.all(color: AppColors.line),
            boxShadow: AppColors.cardShadow,
          ),
          child: const Icon(Icons.chevron_left_rounded, color: AppColors.ink, size: 22),
        ),
      ),
    );
  }
}

class ScreenTopBar extends StatelessWidget {
  const ScreenTopBar({
    super.key,
    this.eyebrow,
    required this.title,
    this.showBack = false,
    this.onBack,
    this.trailing,
  });

  final String? eyebrow;
  final String title;
  final bool showBack;
  final VoidCallback? onBack;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, showBack ? 12 : 18, 20, showBack ? 14 : 6),
      child: Row(
        children: [
          if (showBack) ...[
            BackIconButton(onPressed: onBack),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (eyebrow != null) ...[
                  Text(eyebrow!.toUpperCase(), style: eyebrowStyle()),
                  const SizedBox(height: 4),
                ],
                Text(
                  title,
                  style: GoogleFonts.nunito(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.ink),
                ),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    this.eyebrow,
    required this.title,
    this.trailing,
    this.padding = const EdgeInsets.fromLTRB(20, 22, 20, 12),
  });

  final String? eyebrow;
  final String title;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (eyebrow != null) ...[
                  Text(eyebrow!.toUpperCase(), style: eyebrowStyle(color: AppColors.greenDeep)),
                  const SizedBox(height: 4),
                ],
                Text(
                  title,
                  style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class SoftCard extends StatelessWidget {
  const SoftCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.margin,
    this.radius = AppColors.radiusMd,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final content = Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(radius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: Container(
          width: double.infinity,
          padding: padding ?? const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.bgApp,
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: AppColors.line),
            boxShadow: AppColors.cardShadow,
          ),
          child: child,
        ),
      ),
    );
    if (margin == null) return content;
    return Padding(padding: margin!, child: content);
  }
}

class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(
        text,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.ink),
      ),
    );
  }
}

class PhoneInputBox extends StatelessWidget {
  const PhoneInputBox({super.key, required this.controller, this.maxLength = 10});

  final TextEditingController controller;
  final int maxLength;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppColors.radiusMd),
        border: Border.all(color: AppColors.line, width: 1.5),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            decoration: const BoxDecoration(
              border: Border(right: BorderSide(color: AppColors.line, width: 1.5)),
            ),
            child: Text('+91', style: monoStyle(fontSize: 14, color: AppColors.inkSoft)),
          ),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.phone,
              maxLength: maxLength,
              style: monoStyle(fontSize: 15, fontWeight: FontWeight.w600),
              decoration: const InputDecoration(
                hintText: '98230 12345',
                counterText: '',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ProgressSegments extends StatelessWidget {
  const ProgressSegments({super.key, required this.total, required this.done});

  final int total;
  final int done;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < total; i++) ...[
          if (i > 0) const SizedBox(width: 6),
          Expanded(
            child: Container(
              height: 4,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                color: i < done ? AppColors.blueDeep : AppColors.line,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class AvatarBadge extends StatelessWidget {
  const AvatarBadge({
    super.key,
    required this.label,
    this.imageUrl,
    this.size = 48,
    this.radius = 15,
    this.background = AppColors.blueSoft,
    this.foreground = AppColors.blueDeep,
    this.gradient,
  });

  final String label;
  final String? imageUrl;
  final double size;
  final double radius;
  final Color background;
  final Color foreground;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    final url = imageUrl?.trim();
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: gradient == null ? background : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(radius),
        image: url != null && url.isNotEmpty
            ? DecorationImage(image: NetworkImage(url), fit: BoxFit.cover)
            : null,
      ),
      child: url != null && url.isNotEmpty
          ? null
          : Center(
              child: Text(
                label,
                style: GoogleFonts.nunito(
                  fontWeight: FontWeight.w700,
                  fontSize: size * 0.34,
                  color: gradient != null ? Colors.white : foreground,
                ),
              ),
            ),
    );
  }
}

class FilterChipPill extends StatelessWidget {
  const FilterChipPill({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.blueDeep : AppColors.surface,
          borderRadius: BorderRadius.circular(100),
          border: Border.all(color: selected ? AppColors.blueDeep : AppColors.line),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: selected ? Colors.white : AppColors.inkSoft,
          ),
        ),
      ),
    );
  }
}

class CategoryChipPill extends StatelessWidget {
  const CategoryChipPill({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.iconValue,
  });

  final String label;
  final String? iconValue;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? AppColors.blueSoft : Colors.white,
          borderRadius: BorderRadius.circular(100),
          border: Border.all(
            color: selected ? AppColors.blueDeep : AppColors.line,
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (iconValue != null && iconValue!.trim().isNotEmpty) ...[
              CategoryIcon(value: iconValue, size: 20, radius: 6, fallback: '•'),
              const SizedBox(width: 7),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: selected ? AppColors.blueDeep : AppColors.inkSoft,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SearchFakeField extends StatelessWidget {
  const SearchFakeField({
    super.key,
    required this.hint,
    this.onTap,
    this.controller,
    this.onChanged,
  });

  final String hint;
  final VoidCallback? onTap;
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppColors.radiusMd),
          border: Border.all(color: AppColors.line),
        ),
        child: Row(
          children: [
            const Icon(Icons.search_rounded, size: 18, color: AppColors.inkFaint),
            const SizedBox(width: 10),
            Expanded(
              child: controller == null
                  ? Text(hint, style: const TextStyle(fontSize: 13.5, color: AppColors.inkFaint))
                  : TextField(
                      controller: controller,
                      onChanged: onChanged,
                      style: const TextStyle(fontSize: 13.5),
                      decoration: InputDecoration(
                        hintText: hint,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: false,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class CategoryIcon extends StatelessWidget {
  const CategoryIcon({
    super.key,
    required this.value,
    this.size = 48,
    this.radius = 14,
    this.fallback = '•',
  });

  final String? value;
  final double size;
  final double radius;
  final String fallback;

  @override
  Widget build(BuildContext context) {
    final raw = value?.trim();
    final isUrl = isCategoryImageUrl(raw);

    if (isUrl) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Image.network(
          raw!,
          fit: BoxFit.cover,
          width: size,
          height: size,
          errorBuilder: (_, _, _) => SizedBox(
            width: size,
            height: size,
            child: Center(child: Text(fallback, style: TextStyle(fontSize: size * 0.42))),
          ),
          loadingBuilder: (context, child, progress) {
            if (progress == null) return child;
            return SizedBox(
              width: size,
              height: size,
              child: const Center(
                child: SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.blueDeep),
                ),
              ),
            );
          },
        ),
      );
    }

    return SizedBox(
      width: size,
      height: size,
      child: Center(
        child: Text(
          (raw != null && raw.isNotEmpty) ? raw : fallback,
          style: TextStyle(fontSize: size * 0.5),
        ),
      ),
    );
  }
}

/// Paired background/foreground colours for a category chip.
@immutable
class CategoryTint {
  const CategoryTint(this.background, this.foreground);

  final Color background;
  final Color foreground;
}

const _categoryTints = <CategoryTint>[
  CategoryTint(AppColors.blueSoft, AppColors.blueDeep),
  CategoryTint(AppColors.greenSoft, AppColors.greenDeep),
  CategoryTint(AppColors.tealSoft, AppColors.teal),
  CategoryTint(AppColors.indigoSoft, AppColors.indigo),
  CategoryTint(AppColors.cyanSoft, AppColors.cyan),
  CategoryTint(AppColors.roseSoft, AppColors.rose),
  CategoryTint(AppColors.amberSoft, AppColors.amber),
  CategoryTint(AppColors.mintSoft, AppColors.mint),
];

/// Hashes [seed] so a category keeps the same colour between rebuilds and screens.
CategoryTint categoryTint(String seed) {
  var hash = 0;
  for (final unit in seed.codeUnits) {
    hash = (hash * 31 + unit) & 0x7fffffff;
  }
  return _categoryTints[hash % _categoryTints.length];
}

/// Horizontal "All + category" strip mirroring the category group in the filter
/// sheet, so both stay in step.
class CategoryFilterRow extends StatelessWidget {
  const CategoryFilterRow({
    super.key,
    required this.categories,
    required this.selectedIds,
    required this.onToggle,
    required this.onClear,
    this.padding = const EdgeInsets.fromLTRB(20, 2, 20, 12),
  });

  final List<Category> categories;
  final List<String> selectedIds;
  final ValueChanged<String> onToggle;

  /// Called when "All" is tapped.
  final VoidCallback onClear;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) return const SizedBox.shrink();
    // Scrolls at its natural height so long labels are never clipped.
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: padding,
      child: Row(
        children: [
          _CategoryPill(
            label: 'All',
            tint: const CategoryTint(AppColors.surface, AppColors.inkSoft),
            selected: selectedIds.isEmpty,
            onTap: onClear,
          ),
          for (final c in categories) ...[
            const SizedBox(width: 8),
            _CategoryPill(
              label: c.name,
              iconValue: c.emoji,
              tint: categoryTint(c.slug.isEmpty ? c.id : c.slug),
              selected: selectedIds.contains(c.id),
              onTap: () => onToggle(c.id),
            ),
          ],
        ],
      ),
    );
  }
}

class _CategoryPill extends StatelessWidget {
  const _CategoryPill({
    required this.label,
    required this.tint,
    required this.selected,
    required this.onTap,
    this.iconValue,
  });

  final String label;
  final String? iconValue;
  final CategoryTint tint;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
        decoration: BoxDecoration(
          color: tint.background,
          borderRadius: BorderRadius.circular(100),
          border: Border.all(
            color: selected ? tint.foreground : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if ((iconValue ?? '').trim().isNotEmpty) ...[
              CategoryIcon(value: iconValue, size: 20, radius: 6, fallback: '•'),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                height: 1.3,
                fontWeight: FontWeight.w700,
                color: tint.foreground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void showAppSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
  );
}

void showAppErrorSnack(BuildContext context, Object error) {
  showAppSnack(context, friendlyError(error));
}

Future<void> showAppErrorAlert(
  BuildContext context,
  Object error, {
  String title = 'Something went wrong',
  String? actionLabel,
  VoidCallback? onAction,
}) {
  final message = friendlyError(error);
  return showDialog<void>(
    context: context,
    barrierDismissible: true,
    builder: (ctx) => Dialog(
      backgroundColor: AppColors.bgApp,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusLg)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.roseSoft,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.error_outline_rounded, size: 30, color: AppColors.rose),
            ),
            const SizedBox(height: 18),
            Text(
              title,
              textAlign: TextAlign.center,
              style: GoogleFonts.nunito(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.ink),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13.5, color: AppColors.inkSoft, height: 1.45),
            ),
            const SizedBox(height: 24),
            if (onAction != null && actionLabel != null)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.inkSoft,
                        side: const BorderSide(color: AppColors.line, width: 1.5),
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                        textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                      child: const Text('Dismiss'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        onAction();
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.blueDeep,
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                        textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                      child: Text(actionLabel),
                    ),
                  ),
                ],
              )
            else
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.blueDeep,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                    textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                  child: const Text('OK'),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

Future<bool?> showDeleteConfirmDialog(
  BuildContext context, {
  required String title,
  required String message,
}) {
  return showActionConfirmDialog(
    context,
    title: title,
    message: message,
    confirmLabel: 'Delete',
    icon: Icons.delete_outline_rounded,
    destructive: true,
  );
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.action,
    this.iconColor = AppColors.blueDeep,
    this.iconBackground = AppColors.blueSoft,
    this.padding = const EdgeInsets.symmetric(horizontal: 28, vertical: 28),
  });

  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;
  final Color iconColor;
  final Color iconBackground;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: iconBackground,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 32, color: iconColor),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.ink),
          ),
          if (message != null && message!.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.inkSoft, height: 1.45),
            ),
          ],
          if (action != null) ...[
            const SizedBox(height: 18),
            action!,
          ],
        ],
      ),
    );
  }
}

class GuestPrompt extends StatelessWidget {
  const GuestPrompt({
    super.key,
    required this.title,
    required this.body,
    required this.onLogin,
    this.buttonLabel = 'Log in to continue',
  });

  final String title;
  final String body;
  final String buttonLabel;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: SoftCard(
        padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppColors.blueSoft,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(child: Text('👋', style: TextStyle(fontSize: 22))),
            ),
            const SizedBox(height: 14),
            Text(title, textAlign: TextAlign.center, style: GoogleFonts.nunito(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(body, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: AppColors.inkSoft, height: 1.45)),
            const SizedBox(height: 20),
            PrimaryButton(label: buttonLabel, onPressed: onLogin),
            const SizedBox(height: 10),
            const Text('Free account · Email & password', style: TextStyle(fontSize: 11, color: AppColors.inkFaint)),
          ],
        ),
      ),
    );
  }
}

Future<bool?> showLeaveAppDialog(BuildContext context) {
  return showActionConfirmDialog(
    context,
    title: 'Leave App?',
    message: 'Do you want to exit the application?',
    confirmLabel: 'Leave',
  );
}

Future<bool?> showLogoutConfirmDialog(BuildContext context) {
  return showActionConfirmDialog(
    context,
    title: 'Logout',
    message: 'Are you sure you want to logout?',
    confirmLabel: 'Logout',
  );
}

Future<bool?> showActionConfirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  IconData icon = Icons.logout_rounded,
  bool destructive = false,
}) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: true,
    builder: (ctx) => Dialog(
      backgroundColor: AppColors.bgApp,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusLg)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.blueSoft,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(icon, size: 30, color: AppColors.blueDeep),
            ),
            const SizedBox(height: 18),
            Text(
              title,
              textAlign: TextAlign.center,
              style: GoogleFonts.nunito(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.ink),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13.5, color: AppColors.inkSoft, height: 1.45),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.inkSoft,
                      side: const BorderSide(color: AppColors.line, width: 1.5),
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                      textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    style: FilledButton.styleFrom(
                      backgroundColor: destructive ? AppColors.rose : AppColors.blueDeep,
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
                      textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 14),
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(icon, size: 18),
                        const SizedBox(width: 6),
                        Flexible(child: Text(confirmLabel, overflow: TextOverflow.ellipsis)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}

