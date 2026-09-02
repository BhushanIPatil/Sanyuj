import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class SanyujLogo extends StatelessWidget {
  const SanyujLogo({
    super.key,
    this.size = 80,
    this.plated = true,
  });

  /// Height of the logo artwork.
  final double size;

  /// Rounded brand-gradient plate so the white wordmark stays readable.
  final bool plated;

  static const assetPath = 'assets/brand/sanyuj_logo.png';
  static const aspect = 593 / 640;

  @override
  Widget build(BuildContext context) {
    final imgH = plated ? size * 0.86 : size;
    final imgW = imgH * aspect;
    final image = Image.asset(
      assetPath,
      width: imgW,
      height: imgH,
      fit: BoxFit.contain,
    );

    if (!plated) {
      return SizedBox(width: imgW, height: imgH, child: image);
    }

    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.22),
        gradient: AppColors.logoGradient,
        boxShadow: AppColors.cardShadow,
      ),
      child: image,
    );
  }
}

class SanyujBrandRow extends StatelessWidget {
  const SanyujBrandRow({
    super.key,
    this.logoSize = 44,
  });

  final double logoSize;

  @override
  Widget build(BuildContext context) {
    return SanyujLogo(size: logoSize);
  }
}
