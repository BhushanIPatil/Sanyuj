import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'services/repository.dart';

final repoProvider = Provider((ref) => SanyujRepository());

final authStateProvider = StreamProvider<AuthState>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange;
});

/// Bumped after posting/updating a job so My Jobs refreshes without a full remount.
final myJobsRefreshTickProvider = StateProvider<int>((ref) => 0);

final profileProvider = FutureProvider.autoDispose((ref) async {
  ref.watch(authStateProvider);
  return ref.read(repoProvider).fetchProfile();
});
