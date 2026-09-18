import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_config.dart';
import '../../theme/app_theme.dart';
import '../../widgets/ad_detail_sheet.dart';

class RequestsScreen extends StatefulWidget {
  const RequestsScreen({super.key, this.initialKind});
  final String? initialKind;
  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen> {
  static const _options = [
    (
      'offer',
      'Offer',
      Icons.local_offer_outlined,
      Color(0xFF92400E),
      Color(0xFFFEF3C7),
      AppConfig.offerRequestFormUrl,
    ),
    (
      'notice',
      'Notification',
      Icons.notifications_outlined,
      Color(0xFF115E59),
      Color(0xFFCCFBF1),
      AppConfig.notificationRequestFormUrl,
    ),
  ];
  late String? _kind = _options.any((option) => option.$1 == widget.initialKind)
      ? widget.initialKind
      : 'offer';

  @override
  Widget build(BuildContext context) {
    final selected = _kind == null
        ? null
        : _options.firstWhere((option) => option.$1 == _kind);
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.blueSoft, Colors.white, AppColors.greenSoft],
              ),
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.chat_bubble_outline_rounded,
                      size: 16,
                      color: AppColors.blueDeep,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'LET’S GET YOU NOTICED',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                        color: AppColors.blueDeep,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  'Share it with your neighbourhood.',
                  style: GoogleFonts.nunito(
                    fontSize: 29,
                    height: 1.15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'An offer or an update. Complete the Google Form and we’ll get in touch to help you take the next step.',
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.6,
                    color: AppColors.inkSoft,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  '01  Choose    ·    02  Share    ·    03  We follow up',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.inkSoft,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 26),
          Text(
            'What would you like to share?',
            style: GoogleFonts.nunito(
              fontSize: 17,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              for (var i = 0; i < _options.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: Semantics(
                    selected: _kind == _options[i].$1,
                    button: true,
                    child: InkWell(
                      onTap: () => setState(() => _kind = _options[i].$1),
                      borderRadius: BorderRadius.circular(18),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(
                          vertical: 18,
                          horizontal: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _options[i].$5,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: _options[i].$4.withValues(
                              alpha: _kind == _options[i].$1 ? 1 : 0.25,
                            ),
                            width: _kind == _options[i].$1 ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              _options[i].$3,
                              color: _options[i].$4,
                              size: 25,
                            ),
                            const SizedBox(height: 10),
                            Text(
                              _options[i].$2,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: _options[i].$4,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Icon(
                              _kind == _options[i].$1
                                  ? Icons.check_circle
                                  : Icons.circle_outlined,
                              color: _options[i].$4,
                              size: 16,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 24),
          if (selected == null)
            const Text(
              'Choose an option to get started.',
              style: TextStyle(fontSize: 12, color: AppColors.inkSoft),
            )
          else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.line),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${selected.$2} request',
                    style: GoogleFonts.nunito(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Fill in the Google Form to send your request. Our team will review your details and follow up with you.',
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.6,
                      color: AppColors.inkSoft,
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: selected.$6.isEmpty
                          ? null
                          : () => openCtaUrl(
                              context,
                              selected.$6,
                              goTo: (path) => context.go(path),
                            ),
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: const Text('Open Google Form'),
                      style: FilledButton.styleFrom(
                        backgroundColor: selected.$4,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Opens Google Forms in your browser.',
                    style: TextStyle(fontSize: 11, color: AppColors.inkSoft),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
