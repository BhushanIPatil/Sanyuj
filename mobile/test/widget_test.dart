import 'package:flutter_test/flutter_test.dart';
import 'package:sanyuj/models/models.dart';

void main() {
  test('offer parses without an account or business record', () {
    final offer = AdBanner.fromJson({
      'id': 'offer',
      'brand_name': 'Advertiser',
      'title': 'Summer offer',
      'category': [
        {'id': 'category', 'name': 'Shopping'},
      ],
      'offer_ends_at': '2026-10-01T00:00:00Z',
    });
    expect(offer.title, 'Summer offer');
    expect(offer.category?.name, 'Shopping');
    expect(offer.offerEndsAt, DateTime.utc(2026, 10, 1));
  });
  test('notification parses optional event dates and absent category', () {
    final notice = AreaNotice.fromJson({
      'id': 'notice',
      'title': 'Local update',
      'event_starts_at': 'invalid',
    });
    expect(notice.title, 'Local update');
    expect(notice.eventStartsAt, isNull);
    expect(notice.category, isNull);
  });
}
