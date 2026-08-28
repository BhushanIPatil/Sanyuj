import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_theme.dart';
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
        gradient: disabled ? null : AppColors.heroGradient,
        color: disabled ? AppColors.inkFaint : null,
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

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label, this.open = true});

  final String label;
  final bool open;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: open ? AppColors.greenSoft : AppColors.surface,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
          color: open ? AppColors.greenDeep : AppColors.inkSoft,
        ),
      ),
    );
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
                gradient: i < done ? AppColors.heroGradient : null,
                color: i < done ? null : AppColors.line,
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
    this.size = 48,
    this.radius = 15,
    this.background = AppColors.blueSoft,
    this.foreground = AppColors.blueDeep,
    this.gradient,
  });

  final String label;
  final double size;
  final double radius;
  final Color background;
  final Color foreground;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: gradient == null ? background : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(radius),
      ),
      child: Center(
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
  });

  final String label;
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
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: selected ? AppColors.blueDeep : AppColors.inkSoft,
          ),
        ),
      ),
    );
  }
}

class UrgencyChip extends StatelessWidget {
  const UrgencyChip({
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
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.greenSoft : Colors.white,
            borderRadius: BorderRadius.circular(AppColors.radiusMd),
            border: Border.all(
              color: selected ? AppColors.greenDeep : AppColors.line,
              width: 1.5,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: selected ? AppColors.greenDeep : AppColors.inkSoft,
            ),
          ),
        ),
      ),
    );
  }
}

class JobCardTile extends StatelessWidget {
  const JobCardTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.statusLabel,
    required this.open,
    this.trailingLabel,
    this.onTap,
  });

  final String title;
  final String subtitle;
  final String amount;
  final String statusLabel;
  final bool open;
  final String? trailingLabel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return SoftCard(
      onTap: onTap,
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      padding: const EdgeInsets.all(15),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.35),
                ),
              ),
              const SizedBox(width: 8),
              StatusChip(label: statusLabel, open: open),
            ],
          ),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.inkSoft, height: 1.4)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.only(top: 12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.line, style: BorderStyle.solid)),
            ),
            child: Row(
              children: [
                Text(amount, style: monoStyle(fontSize: 13.5)),
                const Spacer(),
                if (trailingLabel != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: open ? AppColors.blueSoft : AppColors.surface,
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Text(
                      trailingLabel!,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: open ? AppColors.blueDeep : AppColors.inkSoft,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class InterestButton extends StatelessWidget {
  const InterestButton({
    super.key,
    required this.onPressed,
    this.sent = false,
    this.label,
  });

  final VoidCallback onPressed;
  final bool sent;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: sent ? AppColors.greenSoft : Colors.white,
      borderRadius: BorderRadius.circular(100),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(100),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(100),
            border: Border.all(
              color: sent ? AppColors.greenDeep : AppColors.blueDeep,
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                sent ? Icons.check_rounded : Icons.add_rounded,
                size: 14,
                color: sent ? AppColors.greenDeep : AppColors.blueDeep,
              ),
              const SizedBox(width: 6),
              Text(
                label ?? (sent ? 'Interest Sent' : "I'm Interested"),
                style: GoogleFonts.nunito(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: sent ? AppColors.greenDeep : AppColors.blueDeep,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class StatusRowTile extends StatelessWidget {
  const StatusRowTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.when,
    this.ok = true,
    this.icon,
  });

  final String title;
  final String subtitle;
  final String amount;
  final String when;
  final bool ok;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return SoftCard(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 10),
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
      radius: 18,
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: ok ? AppColors.greenSoft : AppColors.amberSoft,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(
              icon ?? (ok ? Icons.check_rounded : Icons.schedule_rounded),
              size: 18,
              color: ok ? AppColors.greenDeep : AppColors.amber,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: ok ? AppColors.greenDeep : AppColors.amber,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(amount, style: monoStyle(fontSize: 13.5)),
              const SizedBox(height: 2),
              Text(when, style: const TextStyle(fontSize: 10.5, color: AppColors.inkFaint)),
            ],
          ),
        ],
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

void showAppSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
  );
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
            const Text('Free account · Indian mobile number', style: TextStyle(fontSize: 11, color: AppColors.inkFaint)),
          ],
        ),
      ),
    );
  }
}

