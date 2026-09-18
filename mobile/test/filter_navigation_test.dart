import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sanyuj/screens/shell/app_shell.dart';
import 'package:sanyuj/widgets/date_range_filter.dart';

void main() {
  test('presets span calendar and leap-year boundaries inclusively', () {
    final presets = dateRangePresets(DateTime(2026, 12, 31, 23, 30));
    expect(presets.first.$2, '');
    expect(
      presets.firstWhere((p) => p.$1 == 'Tomorrow').$2,
      '2027-01-01|2027-01-01',
    );
    expect(
      presets.firstWhere((p) => p.$1 == 'Next 7 days').$2,
      '2026-12-31|2027-01-06',
    );
    expect(
      presets.firstWhere((p) => p.$1 == 'Next 30 days').$2,
      '2026-12-31|2027-01-29',
    );
    expect(
      dateRangePresets(DateTime(2028, 2, 28))[2].$2,
      '2028-02-29|2028-02-29',
    );
  });

  testWidgets(
    'quick dates work in a narrow pane and repeated taps preserve selection',
    (tester) async {
      String value = '';
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: 200,
                child: StatefulBuilder(
                  builder: (context, setState) {
                    return SingleChildScrollView(
                      child: DateRangeFilter(
                        value: value,
                        onChanged: (next) => setState(() => value = next),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.widgetWithText(ChoiceChip, 'Today'));
      await tester.pumpAndSettle();
      final today = dateRangePresets()[1].$2;
      expect(value, today);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Today'));
      await tester.pumpAndSettle();
      expect(value, today);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Custom dates'));
      await tester.pumpAndSettle();
      expect(find.text('Start date'), findsOneWidget);
      expect(find.text('End date'), findsOneWidget);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Any time'));
      await tester.pumpAndSettle();
      expect(value, '');
      expect(find.text('Start date'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'five navigation items fit a small phone with Home in the middle',
    (tester) async {
      tester.view.physicalSize = const Size(320, 700);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final router = GoRouter(
        initialLocation: '/home',
        routes: [
          ShellRoute(
            builder: (context, state, child) => AppShell(child: child),
            routes: [
              for (final path in [
                '/offerly',
                '/notifications',
                '/home',
                '/requests',
                '/sanyuj',
              ])
                GoRoute(
                  path: path,
                  builder: (context, state) => Text('Page: $path'),
                ),
            ],
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();
      final labels = ['Offerly', 'Notify', 'Home', 'Share', 'Sanyuj'];
      final centers = labels
          .map((label) => tester.getCenter(find.text(label)).dx)
          .toList();
      expect(centers[2], closeTo(160, 1));
      for (var i = 1; i < centers.length; i++) {
        expect(centers[i], greaterThan(centers[i - 1]));
      }
      await tester.tap(find.text('Sanyuj'));
      await tester.pumpAndSettle();
      expect(find.text('Page: /sanyuj'), findsOneWidget);
      await tester.tap(find.text('Share'));
      await tester.pumpAndSettle();
      expect(find.text('Page: /requests'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
