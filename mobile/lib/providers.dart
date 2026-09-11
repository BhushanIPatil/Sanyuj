import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'services/repository.dart';

final repoProvider = Provider((ref) => SanyujRepository());
