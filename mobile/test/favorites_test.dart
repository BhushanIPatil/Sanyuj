import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sanyuj/services/favorites.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  test(
    'favorites persist across provider recreation and can be removed',
    () async {
      final first = ProviderContainer();
      await first.read(favoritesProvider.future);
      await first.read(favoritesProvider.notifier).toggle('offer', '123');
      first.dispose();

      final restored = ProviderContainer();
      addTearDown(restored.dispose);
      expect(await restored.read(favoritesProvider.future), {'offer:123'});
      await restored.read(favoritesProvider.notifier).toggle('offer', '123');
      expect(await restored.read(favoritesProvider.future), isEmpty);
      expect(
        (await SharedPreferences.getInstance()).getStringList(
          'favorite_content_ids',
        ),
        isEmpty,
      );
    },
  );

  test('concurrent saves retain offers and notices with the same ID', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final favorites = container.read(favoritesProvider.notifier);
    await Future.wait([
      favorites.toggle('offer', '123'),
      favorites.toggle('notice', '123'),
    ]);
    expect(await container.read(favoritesProvider.future), {
      'offer:123',
      'notice:123',
    });
  });
}
