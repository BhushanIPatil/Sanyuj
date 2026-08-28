import 'package:flutter_test/flutter_test.dart';
import 'package:sanyuj/utils/format.dart';

void main() {
  test('normalizePhone accepts 10-digit Indian numbers', () {
    expect(normalizePhone('9876543210'), '+919876543210');
    expect(normalizePhone('91 98765 43210'), '+919876543210');
    expect(normalizePhone('123'), isNull);
  });

  test('displayPhone formats +91', () {
    expect(displayPhone('+919876543210'), '+91 98765 43210');
  });
}
