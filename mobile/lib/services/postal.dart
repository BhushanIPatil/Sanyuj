import 'dart:convert';

import 'package:http/http.dart' as http;

class PostalLocality {
  const PostalLocality({
    required this.name,
    this.district,
    this.state,
  });

  final String name;
  final String? district;
  final String? state;
}

Future<List<PostalLocality>> fetchLocalitiesForPincode(String pincode) async {
  final res = await http.get(Uri.parse('https://api.postalpincode.in/pincode/$pincode'));
  if (res.statusCode != 200) throw Exception('Could not look up pincode');

  final data = jsonDecode(res.body);
  if (data is! List || data.isEmpty) throw Exception('No localities found for this pincode');

  final block = data.first;
  if (block is! Map) throw Exception('No localities found for this pincode');
  if (block['Status'] != 'Success') throw Exception('No localities found for this pincode');

  final offices = block['PostOffice'];
  if (offices is! List || offices.isEmpty) {
    throw Exception('No localities found for this pincode');
  }

  final seen = <String>{};
  final localities = <PostalLocality>[];
  for (final raw in offices) {
    if (raw is! Map) continue;
    final name = (raw['Name'] as String?)?.trim();
    if (name == null || name.isEmpty || seen.contains(name)) continue;
    seen.add(name);
    localities.add(
      PostalLocality(
        name: name,
        district: (raw['District'] as String?)?.trim(),
        state: (raw['State'] as String?)?.trim(),
      ),
    );
  }

  localities.sort((a, b) => a.name.compareTo(b.name));
  if (localities.isEmpty) throw Exception('No localities found for this pincode');
  return localities;
}
