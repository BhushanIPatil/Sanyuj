import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class GuestSession extends ChangeNotifier {
  GuestSession._();
  static final GuestSession instance = GuestSession._();

  static const _key = 'sanyuj_guest';

  bool _isGuest = false;
  bool get isGuest => _isGuest;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _isGuest = prefs.getBool(_key) ?? false;
    notifyListeners();
  }

  Future<void> enter() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, true);
    _isGuest = true;
    notifyListeners();
  }

  Future<void> clear() async {
    if (!_isGuest) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
    _isGuest = false;
    notifyListeners();
  }
}
