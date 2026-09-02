import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

class PostalLocality {
  const PostalLocality({
    required this.name,
    this.district,
    this.state,
    this.id,
  });

  final String name;
  final String? district;
  final String? state;
  final String? id;
}

class AreaOption {
  const AreaOption({required this.id, required this.localityId, required this.name});

  final String id;
  final String localityId;
  final String name;
}

List<PostalLocality> mergeLocalities(List<PostalLocality> api, List<PostalLocality> cached) {
  final byKey = <String, PostalLocality>{};
  for (final row in cached) {
    final name = row.name.trim();
    if (name.isEmpty) continue;
    byKey[name.toLowerCase()] = row;
  }
  for (final row in api) {
    final name = row.name.trim();
    if (name.isEmpty) continue;
    final key = name.toLowerCase();
    final existing = byKey[key];
    byKey[key] = PostalLocality(
      name: name,
      district: row.district ?? existing?.district,
      state: row.state ?? existing?.state,
      id: existing?.id ?? row.id,
    );
  }
  final list = byKey.values.toList()..sort((a, b) => a.name.compareTo(b.name));
  return list;
}

Future<List<PostalLocality>> fetchCachedLocalities(String pincode) async {
  final data = await Supabase.instance.client
      .from('localities')
      .select('id, name')
      .eq('pincode', pincode)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('name');
  return (data as List)
      .map((raw) {
        final row = Map<String, dynamic>.from(raw as Map);
        return PostalLocality(name: row['name'] as String? ?? '', id: row['id'] as String?);
      })
      .where((l) => l.name.isNotEmpty)
      .toList();
}

Future<List<PostalLocality>> _fetchPostalApi(String pincode) async {
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

Future<List<PostalLocality>> fetchLocalitiesForPincode(String pincode) async {
  var cached = <PostalLocality>[];
  try {
    cached = await fetchCachedLocalities(pincode);
  } catch (_) {}

  try {
    final api = await _fetchPostalApi(pincode);
    return mergeLocalities(api, cached);
  } catch (e) {
    if (cached.isNotEmpty) return cached;
    throw e is Exception ? e : Exception('Could not look up pincode');
  }
}

Future<String?> resolveLocalityId(String pincode, String name) async {
  final row = await Supabase.instance.client
      .from('localities')
      .select('id')
      .eq('pincode', pincode)
      .ilike('name', name.trim())
      .eq('is_deleted', false)
      .maybeSingle();
  if (row == null) return null;
  return row['id'] as String?;
}

Future<List<AreaOption>> fetchAreasForLocality(String localityId) async {
  final data = await Supabase.instance.client
      .from('areas')
      .select('id, locality_id, name')
      .eq('locality_id', localityId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('name');
  return (data as List).map((raw) {
    final row = Map<String, dynamic>.from(raw as Map);
    return AreaOption(
      id: row['id'] as String,
      localityId: row['locality_id'] as String,
      name: row['name'] as String? ?? '',
    );
  }).toList();
}

Future<String> upsertLocality(String pincode, String name) async {
  final data = await Supabase.instance.client.rpc(
    'upsert_locality',
    params: {'p_pincode': pincode, 'p_name': name.trim()},
  );
  if (data is! String || data.isEmpty) throw Exception('Could not save locality');
  return data;
}

Future<void> assertAreaIfRequired(String pincode, String locality, String? areaId) async {
  final localityId = await resolveLocalityId(pincode, locality);
  if (localityId == null) return;
  final areas = await fetchAreasForLocality(localityId);
  if (areas.isNotEmpty && (areaId == null || areaId.isEmpty)) {
    throw Exception('Select your area / colony');
  }
}
