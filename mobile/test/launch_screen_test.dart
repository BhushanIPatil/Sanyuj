import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sanyuj/widgets/launch_screen.dart';
import 'package:sanyuj/widgets/sanyuj_logo.dart';

void main() {
  testWidgets('launch logo moves and repeats during startup', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LaunchScreen()));
    final logo = find.byType(SanyujTransparentLogo);
    final initial = tester.getCenter(logo);
    await tester.pump(const Duration(milliseconds: 250));
    expect(tester.getCenter(logo).dy, lessThan(initial.dy));
    await tester.pump(const Duration(milliseconds: 750));
    expect(tester.getCenter(logo).dy, closeTo(initial.dy, 0.01));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('launch respects reduced motion', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(disableAnimations: true),
          child: LaunchScreen(),
        ),
      ),
    );
    final logo = find.byType(SanyujTransparentLogo);
    final initial = tester.getCenter(logo);
    await tester.pump(const Duration(milliseconds: 250));
    expect(tester.getCenter(logo), initial);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
