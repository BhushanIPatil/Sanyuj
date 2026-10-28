import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final favoritesProvider = AsyncNotifierProvider<Favorites, Set<String>>(
  Favorites.new,
);

String favoriteKey(String kind, String id) => '$kind:$id';

class Favorites extends AsyncNotifier<Set<String>> {
  static const _storageKey = 'favorite_content_ids';
  Future<void> _pendingWrite = Future.value();

  @override
  Future<Set<String>> build() async {
    final preferences = await SharedPreferences.getInstance();
    return Set.unmodifiable(preferences.getStringList(_storageKey) ?? []);
  }

  Future<void> toggle(String kind, String id) {
    // Serialize writes so taps on different cards cannot overwrite each other.
    final write = _pendingWrite.then((_) async {
      final current = await future;
      final next = {...current};
      final key = favoriteKey(kind, id);
      if (!next.remove(key)) next.add(key);
      final preferences = await SharedPreferences.getInstance();
      if (!await preferences.setStringList(_storageKey, next.toList())) {
        throw Exception('Could not save favorite. Please try again.');
      }
      state = AsyncData(Set.unmodifiable(next));
    });
    _pendingWrite = write.catchError((Object _) {});
    return write;
  }
}
