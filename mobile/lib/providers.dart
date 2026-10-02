import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'services/repository.dart';
import 'widgets/filters.dart';

final repoProvider = Provider((ref) => SanyujRepository());

// Keep the chosen area when route widgets are recreated.
final manualGeoProvider = StateProvider<GeoFilter?>((ref) => null);
