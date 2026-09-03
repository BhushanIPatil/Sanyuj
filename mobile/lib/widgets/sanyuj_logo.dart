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

  /// Rounded white plate behind the app mark.
  final bool plated;

  static const assetPath = 'assets/brand/sanyuj_logo.png';
  static const aspect = 1312 / 1199;

  @override
  Widget build(BuildContext context) {
    final imgH = plated ? size * 0.72 : size;
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
        color: AppColors.logoPlate,
        border: Border.all(color: AppColors.line),
        boxShadow: AppColors.cardShadow,
      ),
      child: image,
    );
  }
}

/// Brand lockup (icon + wordmark) on a transparent background — for auth / splash.
class SanyujTransparentLogo extends StatelessWidget {
  const SanyujTransparentLogo({super.key, this.size = 140});

  final double size;

  static const assetPath = 'assets/brand/sanyuj_transparent.png';
  static const aspect = 736 / 763;

  @override
  Widget build(BuildContext context) {
    final height = size;
    final width = height * aspect;
    return Image.asset(
      assetPath,
      width: width,
      height: height,
      fit: BoxFit.contain,
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
