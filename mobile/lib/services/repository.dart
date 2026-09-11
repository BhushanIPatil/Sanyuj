import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/models.dart';

PostgrestFilterBuilder<T> visible<T>(PostgrestFilterBuilder<T> query) =>
    query.eq('is_active', true).eq('is_deleted', false);

class SanyujRepository {
  SupabaseClient get _db => Supabase.instance.client;

  Future<List<AdBanner>> fetchAds({
    String? pincode,
    String? localityId,
    String? areaId,
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
    final query = visible(
      _db
          .from('ads')
          .select(
            'id, brand_name, title, body, cta_label, cta_url, image_url, background, offer_starts_at, offer_ends_at, created_at, category:content_categories(id, slug, name, emoji)',
          ),
    ).inFilter('id', ids);
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
      _db
          .from('notices')
          .select(
            'id, title, body, image_url, cta_label, cta_url, event_starts_at, event_ends_at, created_at, category:content_categories(id, slug, name, emoji)',
          ),
    ).inFilter('id', ids).order('sort_order');
    return (data as List)
        .map((e) => AreaNotice.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<List<ContentCategory>> fetchContentCategories(String kind) async {
    final data = await visible(
      _db
          .from('content_categories')
          .select('id, kind, slug, name, emoji, sort_order'),
    ).eq('kind', kind).order('sort_order');
    return (data as List)
        .map(
          (e) => ContentCategory.fromJson(Map<String, dynamic>.from(e as Map)),
        )
        .toList();
  }
}
