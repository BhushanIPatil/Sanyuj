import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sanyuj/widgets/location_disclosure.dart';

void main() {
  for (final action in ['Not now', 'Use current pincode', 'dismiss']) {
    testWidgets('Location disclosure: $action', (tester) async {
      bool? accepted;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () async {
                  accepted = await confirmLocationUse(context);
                },
                child: const Text('Locate'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Locate'));
      await tester.pumpAndSettle();
      expect(accepted, isNull);
      expect(
        find.textContaining('Use your location to find your current pincode'),
        findsOneWidget,
      );
      if (action == 'dismiss') {
        await tester.tapAt(const Offset(5, 5));
      } else {
        await tester.tap(find.text(action));
      }
      await tester.pumpAndSettle();
      expect(accepted, action == 'Use current pincode');
    });
  }
}
