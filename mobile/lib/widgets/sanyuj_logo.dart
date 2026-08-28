import 'package:flutter/material.dart';

class SanyujLogo extends StatelessWidget {
  const SanyujLogo({
    super.key,
    this.size = 80,
    this.scale = 1.15,
    this.fit = BoxFit.contain,
  });

  final double size;
  final double scale;
  final BoxFit fit;

  static const assetPath = 'assets/brand/sanyuj_logo.png';

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: ClipRect(
        child: Center(
          child: Transform.scale(
            scale: scale,
            child: Image.asset(
              assetPath,
              width: size,
              height: size,
              fit: fit,
            ),
          ),
        ),
      ),
    );
  }
}

class SanyujBrandRow extends StatelessWidget {
  const SanyujBrandRow({
    super.key,
    this.logoSize = 44,
    this.nameStyle,
  });

  final double logoSize;
  final TextStyle? nameStyle;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SanyujLogo(size: logoSize),
        const SizedBox(width: 10),
        Text(
          'Sanyuj',
          style: nameStyle ??
              const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
        ),
      ],
    );
  }
}
