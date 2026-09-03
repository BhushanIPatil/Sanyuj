import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const bgPage = Color(0xFFECF3F1);
  static const bgApp = Color(0xFFFFFFFF);
  static const surface = Color(0xFFF5FAF9);
  static const ink = Color(0xFF152033);
  static const inkSoft = Color(0xFF66727F);
  static const inkFaint = Color(0xFFA6B0BA);
  static const line = Color(0xFFEAF0EF);

  static const blue = Color(0xFF2E86D6);
  static const blueDeep = Color(0xFF1D5FA0);
  static const blueSoft = Color(0xFFE6F2FE);
  /// White plate behind the app mark.
  static const logoPlate = Color(0xFFFFFFFF);
  static const green = Color(0xFF1FAE7A);
  static const greenDeep = Color(0xFF167F5A);
  static const greenSoft = Color(0xFFE1F9EE);
  static const teal = Color(0xFF0EA5A5);
  static const tealSoft = Color(0xFFDFF7F5);
  static const indigo = Color(0xFF3B5BDB);
  static const indigoSoft = Color(0xFFE7EAFB);
  static const mint = Color(0xFF16A085);
  static const mintSoft = Color(0xFFDFF6EF);
  static const cyan = Color(0xFF0EA5E9);
  static const cyanSoft = Color(0xFFE1F4FD);
  static const rose = Color(0xFFE5484D);
  static const roseSoft = Color(0xFFFDECEC);
  static const amber = Color(0xFFD6A020);
  static const amberSoft = Color(0xFFFBF3DE);

  static const radiusLg = 26.0;
  static const radiusMd = 18.0;
  static const radiusSm = 12.0;

  static const heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [blue, green],
  );

  static const logoGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF10549C),
      Color(0xFF0E8094),
      Color(0xFF12966C),
    ],
  );

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: ink.withValues(alpha: 0.06),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get popShadow => [
        BoxShadow(
          color: ink.withValues(alpha: 0.14),
          blurRadius: 30,
          offset: const Offset(0, 14),
        ),
      ];

  static List<BoxShadow> get ctaShadow => [
        BoxShadow(
          color: const Color(0xFF1D5FA0).withValues(alpha: 0.30),
          blurRadius: 22,
          offset: const Offset(0, 10),
        ),
      ];
}

ThemeData buildAppTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppColors.bgApp,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.blue,
      primary: AppColors.blueDeep,
      secondary: AppColors.green,
      surface: AppColors.bgApp,
      error: AppColors.rose,
    ),
  );

  final baseText = GoogleFonts.nunitoTextTheme(base.textTheme).apply(
    bodyColor: AppColors.ink,
    displayColor: AppColors.ink,
  );

  final text = baseText.copyWith(
    displayLarge: textDisplayStyle(baseText.displayLarge, FontWeight.w800),
    displayMedium: textDisplayStyle(baseText.displayMedium, FontWeight.w800),
    displaySmall: textDisplayStyle(baseText.displaySmall, FontWeight.w700),
    headlineLarge: textDisplayStyle(baseText.headlineLarge, FontWeight.w800),
    headlineMedium: textDisplayStyle(baseText.headlineMedium, FontWeight.w700),
    headlineSmall: textDisplayStyle(baseText.headlineSmall, FontWeight.w700),
    titleLarge: textDisplayStyle(baseText.titleLarge, FontWeight.w700),
    titleMedium: textDisplayStyle(baseText.titleMedium, FontWeight.w700),
    titleSmall: textDisplayStyle(baseText.titleSmall, FontWeight.w700),
  );

  return base.copyWith(
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.bgApp,
      foregroundColor: AppColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: text.titleMedium?.copyWith(fontWeight: FontWeight.w700, fontSize: 18),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.bgApp,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.ink),
      hintStyle: const TextStyle(color: AppColors.inkFaint, fontSize: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppColors.radiusMd),
        borderSide: const BorderSide(color: AppColors.line, width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppColors.radiusMd),
        borderSide: const BorderSide(color: AppColors.line, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppColors.radiusMd),
        borderSide: const BorderSide(color: AppColors.blueDeep, width: 1.5),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.bgApp,
      selectedColor: AppColors.blueSoft,
      side: const BorderSide(color: AppColors.line, width: 1.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
      labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.inkSoft),
      secondaryLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.blueDeep),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.blueDeep,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
        textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.bgApp,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppColors.radiusMd),
        side: const BorderSide(color: AppColors.line),
      ),
    ),
    dividerColor: AppColors.line,
    snackBarTheme: SnackBarThemeData(
      backgroundColor: AppColors.ink,
      contentTextStyle: GoogleFonts.nunito(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppColors.radiusMd)),
    ),
  );
}

TextStyle? textDisplayStyle(TextStyle? style, FontWeight weight) {
  return style?.copyWith(fontWeight: weight, color: AppColors.ink);
}

TextStyle monoStyle({
  double fontSize = 14,
  FontWeight fontWeight = FontWeight.w700,
  Color color = AppColors.ink,
  double? letterSpacing,
}) {
  return GoogleFonts.jetBrainsMono(
    fontSize: fontSize,
    fontWeight: fontWeight,
    color: color,
    letterSpacing: letterSpacing,
  );
}

/// Currency / ₹ amounts — medium weight (not bold).
TextStyle currencyStyle({
  double fontSize = 14,
  Color color = AppColors.ink,
  double? letterSpacing,
}) {
  return monoStyle(
    fontSize: fontSize,
    fontWeight: FontWeight.w500,
    color: color,
    letterSpacing: letterSpacing,
  );
}

TextStyle eyebrowStyle({Color color = AppColors.inkSoft}) {
  return GoogleFonts.jetBrainsMono(
    fontSize: 10.5,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.8,
    color: color,
  );
}

TextStyle displayStyle({
  double fontSize = 18,
  FontWeight fontWeight = FontWeight.w700,
  Color color = AppColors.ink,
  double? height,
}) {
  return GoogleFonts.nunito(
    fontSize: fontSize,
    fontWeight: fontWeight,
    color: color,
    height: height,
  );
}
