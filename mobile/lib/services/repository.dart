import 'package:image_picker/image_picker.dart';
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
          'id, slug, name, emoji, group_id, sort_order, is_other, category_groups!inner(id, slug, name, sort_order, is_active, is_deleted)',
        )
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('is_other', false)
        .eq('category_groups.is_active', true)
        .eq('category_groups.is_deleted', false)
        .neq('category_groups.slug', 'other')
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
          sortOrder: gMap['sort_order'] as int? ?? 0,
          categories: [],
        ),
      );
      group.categories.add(Category.fromJson(row));
    }

    final groups = byGroup.values.toList()
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    for (final g in groups) {
      g.categories.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    }
    return groups;
  }

  Future<Business?> fetchMyBusiness() async {
    final uid = userId;
    if (uid == null) return null;
    final row = await visible(
      _db.from('businesses').select(
            'id, name, owner_id, photo_url, response_rate, categories(id, name, slug, emoji, group_id, is_other)',
          ),
    ).eq('owner_id', uid).maybeSingle();
    if (row == null) return null;
    return Business.fromJson(Map<String, dynamic>.from(row));
  }

  Future<List<Business>> fetchBusinesses({
    String? categoryId,
    String? pincode,
    String? localityId,
    String? areaId,
    bool excludeOwn = false,
    int limit = 200,
  }) async {
    var q = visible(
      _db.from('businesses').select(
            'id, name, response_rate, owner_id, photo_url, created_at, categories(id, name, slug, emoji, group_id, is_other)',
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

    final data = await q.order('name').limit(limit);
    var businesses = (data as List)
        .map((e) => Business.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    if (excludeOwn && userId != null) {
      businesses = businesses.where((b) => b.ownerId != userId).toList();
    }
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
            'id, started_at, ends_at, businesses(id, name, owner_id, photo_url, categories(id, name, slug, emoji, group_id, is_other))',
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
        _db.from('profiles').select('id, full_name, phone, address'),
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
      bizMap['providerName'] = owner?['full_name'];
      bizMap['phone'] = owner?['phone'];
      bizMap['address'] = owner?['address'];
      return {...row, 'businesses': bizMap};
    }).toList();
  }

  Future<List<AdBanner>> fetchAds({
    String? pincode,
    String? localityId,
    String? areaId,
    bool homeScreenOnly = false,
    int? limit = 8,
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
    var query = visible(
      _db.from('ads').select(
        'id, brand_name, title, body, cta_label, cta_url, image_url, background, offer_starts_at, offer_ends_at, created_at, category:content_categories(id, slug, name, emoji)',
      ),
    ).inFilter('id', ids);
    if (homeScreenOnly) {
      query = query.eq('is_home_screen', true);
    }
    final ordered = query.order('sort_order');
    final data = await (limit != null ? ordered.limit(limit) : ordered);
    return (data as List)
        .map((e) => AdBanner.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<List<AreaNotice>> fetchNotices({
    String? pincode,
    String? localityId,
    String? areaId,
  }) async {
    final covering = await _db.rpc(
      'notices_covering',
      params: {
        'p_pincode': pincode,
        'p_locality_id': localityId,
        'p_area_id': areaId,
      },
    );
    final ids = (covering as List)
        .map((e) {
          if (e is String) return e;
          if (e is Map) return (e['notice_id'] ?? e['id']) as String?;
          return null;
        })
        .whereType<String>()
        .toList();
    if (ids.isEmpty) return [];
    final data = await visible(
      _db.from('notices').select(
        'id, title, body, image_url, cta_label, cta_url, event_starts_at, event_ends_at, created_at, category:content_categories(id, slug, name, emoji)',
      ),
    ).inFilter('id', ids).order('sort_order');
    return (data as List)
        .map((e) => AreaNotice.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<List<ContentCategory>> fetchContentCategories(String kind) async {
    final data = await visible(
      _db.from('content_categories').select('id, kind, slug, name, emoji, sort_order'),
    ).eq('kind', kind).order('sort_order');
    return (data as List)
        .map((e) => ContentCategory.fromJson(Map<String, dynamic>.from(e as Map)))
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

  Future<String> resolveCategoryId({
    required String selectedId,
    required String customName,
  }) async {
    if (selectedId != kOtherCategoryId) return selectedId;
    final name = customName.trim();
    if (name.length < 2) throw Exception('Enter your category name');
    final data = await _db.rpc('create_other_category', params: {'p_name': name});
    final id = data is String ? data : null;
    if (id == null || id.isEmpty) throw Exception('Could not save category');
    return id;
  }

  Future<void> createBusiness({
    required String name,
    required String categoryId,
    required String phone,
    String? photoUrl,
  }) async {
    final uid = userId;
    if (uid == null) throw Exception('Not signed in');
    await _db.from('profiles').update({'phone': phone}).eq('id', uid);
    await _db.from('businesses').insert({
      'owner_id': uid,
      'name': name,
      'category_id': categoryId,
      'photo_url': photoUrl,
      'is_active': true,
      'is_deleted': false,
    });
  }

  Future<void> updateBusiness({
    required String id,
    required String name,
    required String categoryId,
    required String phone,
  }) async {
    final uid = userId;
    if (uid == null) throw Exception('Not signed in');
    await _db.from('profiles').update({'phone': phone}).eq('id', uid);
    await _db.from('businesses').update({
      'name': name,
      'category_id': categoryId,
    }).eq('id', id).eq('owner_id', uid);
  }

  Future<void> deleteOwnBusiness() async {
    if (userId == null) throw Exception('Not signed in');
    await _db.rpc('delete_own_business');
  }

  String? _storagePathFromPublicUrl(String? url) {
    if (url == null || url.isEmpty) return null;
    const marker = '/object/public/business-photos/';
    final i = url.indexOf(marker);
    if (i < 0) return null;
    final path = Uri.decodeComponent(url.substring(i + marker.length).split('?').first);
    return path.isEmpty ? null : path;
  }

  String _contentTypeFor(String path) {
    final ext = path.split('.').last.toLowerCase();
    if (ext == 'png') return 'image/png';
    if (ext == 'webp') return 'image/webp';
    return 'image/jpeg';
  }

  Future<void> removeStoredBusinessPhoto(String? photoUrl) async {
    final path = _storagePathFromPublicUrl(photoUrl);
    if (path == null) return;
    try {
      await _db.storage.from('business-photos').remove([path]);
    } catch (_) {}
  }

  Future<String> uploadBusinessPhoto(XFile file, {String? previousUrl}) async {
    final uid = userId;
    if (uid == null) throw Exception('Not signed in');
    final bytes = await file.readAsBytes();
    if (bytes.length > 5 * 1024 * 1024) {
      throw Exception('Photo must be 5 MB or smaller');
    }
    final ext = () {
      final fromName = file.name.split('.').last.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp'].contains(fromName)) {
        return fromName == 'jpeg' ? 'jpg' : fromName;
      }
      final fromPath = file.path.split('.').last.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp'].contains(fromPath)) {
        return fromPath == 'jpeg' ? 'jpg' : fromPath;
      }
      return 'jpg';
    }();
    final path = '$uid/profile-${DateTime.now().millisecondsSinceEpoch}.$ext';
    await _db.storage.from('business-photos').uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(upsert: true, contentType: _contentTypeFor(path)),
        );
    await removeStoredBusinessPhoto(previousUrl);
    final publicUrl = _db.storage.from('business-photos').getPublicUrl(path);
    return '$publicUrl?t=${DateTime.now().millisecondsSinceEpoch}';
  }

  Future<void> setBusinessPhoto({required String businessId, required String? photoUrl}) async {
    final uid = userId;
    if (uid == null) throw Exception('Not signed in');
    await _db.from('businesses').update({'photo_url': photoUrl}).eq('id', businessId).eq('owner_id', uid);
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

  static const liveSessionDuration = Duration(hours: 2);

  /// The provider's own live session that has not expired yet, if any.
  Future<Map<String, dynamic>?> fetchActiveLiveSession(String businessId) async {
    if (userId == null) return null;
    final rows = await visible(
      _db.from('live_sessions').select('id, business_id, pincode, started_at, ends_at'),
    )
        .eq('business_id', businessId)
        .gt('ends_at', DateTime.now().toUtc().toIso8601String())
        .order('started_at', ascending: false)
        .limit(1);
    final list = rows as List;
    if (list.isEmpty) return null;
    return Map<String, dynamic>.from(list.first as Map);
  }

  Future<Map<String, dynamic>> goLive({
    required String businessId,
    required String pincode,
  }) async {
    final covers = await businessCoversPincode(businessId: businessId, pincode: pincode);
    if (!covers) throw Exception('Add this pincode to your service areas before going live');
    // Only one session should be live at a time, so clear any earlier one first.
    await _db.from('live_sessions').delete().eq('business_id', businessId);
    final row = await _db
        .from('live_sessions')
        .insert({
          'business_id': businessId,
          'pincode': pincode,
          'ends_at': DateTime.now().toUtc().add(liveSessionDuration).toIso8601String(),
          'is_active': true,
          'is_deleted': false,
        })
        .select('id, business_id, pincode, started_at, ends_at')
        .single();
    return Map<String, dynamic>.from(row);
  }

  Future<void> stopLive(String sessionId) async {
    await _db.from('live_sessions').delete().eq('id', sessionId);
  }
}
