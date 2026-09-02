import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/models.dart';

PostgrestFilterBuilder<T> visible<T>(PostgrestFilterBuilder<T> query) =>
    query.eq('is_active', true).eq('is_deleted', false);

class SanyujRepository {
  SupabaseClient get _db => Supabase.instance.client;

  String? get userId => _db.auth.currentUser?.id;

  Future<Profile?> fetchProfile([String? id]) async {
    final uid = id ?? userId;
    if (uid == null) return null;
    final row = await visible(_db.from('profiles').select())
        .eq('id', uid)
        .maybeSingle();
    if (row == null) return null;
    return Profile.fromJson(Map<String, dynamic>.from(row));
  }

  Future<void> updateProfile(Map<String, dynamic> data) async {
    final uid = userId;
    if (uid == null) throw Exception('Not signed in');
    await visible(_db.from('profiles').update(data)).eq('id', uid);
  }

  Future<List<CategoryGroup>> fetchCategoryTree() async {
    final data = await _db
        .from('categories')
        .select(
          'id, slug, name, emoji, group_id, sort_order, category_groups!inner(id, slug, name, sort_order, is_active, is_deleted)',
        )
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('category_groups.is_active', true)
        .eq('category_groups.is_deleted', false)
        .order('sort_order');

    final byGroup = <String, CategoryGroup>{};
    for (final raw in data as List) {
      final row = Map<String, dynamic>.from(raw as Map);
      final gRaw = row['category_groups'];
      final gMap = gRaw is List
          ? (gRaw.isNotEmpty ? Map<String, dynamic>.from(gRaw.first as Map) : null)
          : (gRaw is Map ? Map<String, dynamic>.from(gRaw) : null);
      if (gMap == null) continue;
      final gid = gMap['id'] as String;
      final group = byGroup.putIfAbsent(
        gid,
        () => CategoryGroup(
          id: gid,
          slug: gMap['slug'] as String? ?? '',
          name: gMap['name'] as String? ?? '',
          categories: [],
        ),
      );
      group.categories.add(Category.fromJson(row));
    }
    return byGroup.values.toList();
  }

  Future<Business?> fetchMyBusiness() async {
    final uid = userId;
    if (uid == null) return null;
    final row = await visible(
      _db.from('businesses').select(
            'id, name, owner_id, rating, jobs_done, response_rate, categories(id, name, slug, emoji, group_id)',
          ),
    ).eq('owner_id', uid).maybeSingle();
    if (row == null) return null;
    return Business.fromJson(Map<String, dynamic>.from(row));
  }

  Future<List<Job>> fetchMyJobs() async {
    final uid = userId;
    if (uid == null) return [];
    final data = await visible(
      _db.from('jobs').select(
            'id, title, description, status, pincode, locality, area, created_at, budget_min, budget_max, urgency, customer_id, categories(id, name, slug, emoji, group_id)',
          ),
    ).eq('customer_id', uid).order('created_at', ascending: false);
    return (data as List)
        .map((e) => Job.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<List<Job>> fetchOpenJobsForBusiness(String businessId, {String? categoryId}) async {
    final rawIds = await _db.rpc('jobs_covered_by_business', params: {'p_business_id': businessId});
    final ids = (rawIds as List)
        .map((e) {
          if (e is String) return e;
          if (e is Map) return (e['job_id'] ?? e['id']) as String?;
          return null;
        })
        .whereType<String>()
        .toList();
    if (ids.isEmpty) return [];
    var q = visible(
      _db.from('jobs').select(
            'id, title, description, status, pincode, locality, area, created_at, budget_min, budget_max, urgency, customer_id, categories(id, name, slug, emoji, group_id)',
          ),
    ).eq('status', 'open').inFilter('id', ids);
    if (categoryId != null) q = q.eq('category_id', categoryId);
    final data = await q.order('created_at', ascending: false).limit(40);
    return (data as List).map((e) => Job.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<Job?> fetchJob(String id) async {
    final row = await visible(
      _db.from('jobs').select(
            'id, title, description, status, pincode, locality, area, created_at, budget_min, budget_max, urgency, customer_id, categories(id, name, slug, emoji, group_id)',
          ),
    ).eq('id', id).maybeSingle();
    if (row == null) return null;
    return Job.fromJson(Map<String, dynamic>.from(row));
  }

  Future<void> postJob({
    required String categoryId,
    required String title,
    required String description,
    required String pincode,
    required String locality,
    String? areaId,
    String? area,
    required String urgency,
    int? budgetMin,
    int? budgetMax,
  }) async {
    final uid = userId;
    if (uid == null) throw Exception('Not signed in');
    await _db.from('jobs').insert({
      'customer_id': uid,
      'category_id': categoryId,
      'title': title,
      'description': description,
      'budget_min': budgetMin,
      'budget_max': budgetMax,
      'urgency': urgency,
      'pincode': pincode,
      'locality': locality,
      'area_id': areaId,
      'area': area,
      'is_active': true,
      'is_deleted': false,
    });
  }

  Future<List<Business>> fetchBusinesses({
    String? categoryId,
    String? pincode,
    String? localityId,
    String? areaId,
  }) async {
    var q = visible(
      _db.from('businesses').select(
            'id, name, rating, jobs_done, response_rate, owner_id, categories(id, name, slug, emoji, group_id)',
          ),
    );
    if (categoryId != null) q = q.eq('category_id', categoryId);

    if (pincode != null && pincode.isNotEmpty) {
      final covering = await _db.rpc(
        'businesses_covering',
        params: {
          'p_pincode': pincode,
          'p_locality_id': localityId,
          'p_area_id': areaId,
        },
      );
      final ids = (covering as List)
          .map((e) {
            if (e is String) return e;
            if (e is Map) return (e['business_id'] ?? e['id']) as String?;
            return null;
          })
          .whereType<String>()
          .toList();
      if (ids.isEmpty) return [];
      q = q.inFilter('id', ids);
    }

    final data = await q.order('rating', ascending: false).limit(40);
    final businesses = (data as List)
        .map((e) => Business.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    if (businesses.isEmpty) return [];

    final ownerIds = businesses.map((b) => b.ownerId).where((id) => id.isNotEmpty).toSet().toList();
    final owners = <String, Map<String, dynamic>>{};
    if (ownerIds.isNotEmpty) {
      final ownerRows = await visible(
        _db.from('profiles').select('id, full_name, phone, pincode, locality, address, lat, lng'),
      ).inFilter('id', ownerIds);
      for (final raw in ownerRows as List) {
        final o = Map<String, dynamic>.from(raw as Map);
        owners[o['id'] as String] = o;
      }
    }

    return businesses.map((b) {
      final o = owners[b.ownerId];
      if (o == null) return b;
      return b.copyWith(
        providerName: o['full_name'] as String?,
        phone: o['phone'] as String?,
        address: o['address'] as String?,
        lat: (o['lat'] as num?)?.toDouble(),
        lng: (o['lng'] as num?)?.toDouble(),
      );
    }).toList();
  }

  Future<List<Map<String, dynamic>>> fetchLiveSessions([String? pincode]) async {
    var q = visible(
      _db.from('live_sessions').select(
            'id, started_at, ends_at, businesses(id, name, owner_id, categories(id, name, slug, emoji))',
          ),
    ).gt('ends_at', DateTime.now().toUtc().toIso8601String());
    if (pincode != null && pincode.isNotEmpty) {
      q = q.eq('pincode', pincode);
    }
    final data = await q.order('started_at', ascending: false).limit(10);

    final rows = (data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    final ownerIds = <String>{};
    for (final row in rows) {
      final biz = row['businesses'];
      if (biz is Map && biz['owner_id'] is String) {
        ownerIds.add(biz['owner_id'] as String);
      }
    }

    final owners = <String, Map<String, dynamic>>{};
    if (ownerIds.isNotEmpty) {
      final ownerRows = await visible(
        _db.from('profiles').select('id, full_name, phone'),
      ).inFilter('id', ownerIds.toList());
      for (final raw in ownerRows as List) {
        final o = Map<String, dynamic>.from(raw as Map);
        owners[o['id'] as String] = o;
      }
    }

    return rows.map((row) {
      final biz = row['businesses'];
      if (biz is! Map) return row;
      final bizMap = Map<String, dynamic>.from(biz);
      final owner = owners[bizMap['owner_id'] as String?];
      bizMap['ownerName'] = owner?['full_name'];
      bizMap['ownerPhone'] = owner?['phone'];
      return {...row, 'businesses': bizMap};
    }).toList();
  }

  Future<List<AdBanner>> fetchAds({
    String? pincode,
    String? localityId,
    String? areaId,
  }) async {
    final covering = await _db.rpc(
      'ads_covering',
      params: {
        'p_pincode': pincode,
        'p_locality_id': localityId,
        'p_area_id': areaId,
      },
    );
    final ids = (covering as List)
        .map((e) {
          if (e is String) return e;
          if (e is Map) return (e['ad_id'] ?? e['id']) as String?;
          return null;
        })
        .whereType<String>()
        .toList();
    if (ids.isEmpty) return [];
    final data = await visible(
      _db.from('ads').select(
        'id, brand_name, title, body, cta_label, cta_url, image_url, background, offer_starts_at, offer_ends_at',
      ),
    ).inFilter('id', ids).order('sort_order').limit(8);
    return (data as List)
        .map((e) => AdBanner.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<void> recordAdClick(String adId) async {
    if (userId == null) return;
    try {
      await _db.rpc('record_ad_click', params: {'p_ad_id': adId});
    } catch (_) {
      // Non-blocking analytics
    }
  }

  Future<void> createBusiness({
    required String name,
    required String categoryId,
  }) async {
    final uid = userId;
    if (uid == null) throw Exception('Not signed in');
    await _db.from('businesses').insert({
      'owner_id': uid,
      'name': name,
      'category_id': categoryId,
      'is_active': true,
      'is_deleted': false,
    });
  }

  Future<void> expressInterest({
    required String jobId,
    required String businessId,
    int? offeredAmount,
  }) async {
    await _db.from('job_interests').insert({
      'job_id': jobId,
      'business_id': businessId,
      'offered_amount': offeredAmount,
      'is_active': true,
      'is_deleted': false,
    });
  }

  Future<bool> businessCoversPincode({required String businessId, required String pincode}) async {
    final data = await _db.rpc(
      'business_covers_pincode',
      params: {'p_business_id': businessId, 'p_pincode': pincode},
    );
    return data == true;
  }

  Future<List<Map<String, dynamic>>> fetchBusinessCoverage(String businessId) async {
    final data = await visible(
      _db.from('business_service_areas').select(
            'id, business_id, pincode, locality_id, area_id, localities(id, name), areas(id, name)',
          ),
    ).eq('business_id', businessId).order('pincode');
    return (data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> savePincodeCoverage({
    required String businessId,
    required String pincode,
    required bool entirePincode,
    List<Map<String, dynamic>> items = const [],
  }) async {
    await _db.rpc(
      'replace_pincode_coverage',
      params: {
        'p_business_id': businessId,
        'p_pincode': pincode,
        'p_mode': entirePincode ? 'whole' : 'precise',
        'p_items': items
            .map(
              (item) => {
                'locality_name': item['localityName'],
                'entire_locality': item['entireLocality'] == true,
                'area_ids': item['areaIds'] ?? <String>[],
              },
            )
            .toList(),
      },
    );
  }

  Future<void> removePincodeCoverage({required String businessId, required String pincode}) async {
    await _db.from('business_service_areas').delete().eq('business_id', businessId).eq('pincode', pincode);
  }

  Future<void> goLive({required String businessId, required String pincode}) async {
    final covers = await businessCoversPincode(businessId: businessId, pincode: pincode);
    if (!covers) throw Exception('Add this pincode to your service areas before going live');
    await _db.from('live_sessions').insert({
      'business_id': businessId,
      'pincode': pincode,
      'ends_at': DateTime.now().toUtc().add(const Duration(hours: 2)).toIso8601String(),
      'is_active': true,
      'is_deleted': false,
    });
  }

  Future<void> stopLive(String sessionId) async {
    await visible(_db.from('live_sessions').update({
      'is_active': false,
      'ends_at': DateTime.now().toUtc().toIso8601String(),
    })).eq('id', sessionId);
  }
}
