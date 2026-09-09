import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'services/repository.dart';

final repoProvider = Provider((ref) => SanyujRepository());

final authStateProvider = StreamProvider<AuthState>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange;
});

final profileProvider = FutureProvider.autoDispose((ref) async {
  ref.watch(authStateProvider);
  return ref.read(repoProvider).fetchProfile();
});
