class ContentCategory {
  ContentCategory({
    required this.id,
    required this.kind,
    required this.slug,
    required this.name,
    this.emoji,
    this.sortOrder = 0,
  });

  final String id;
  final String kind;
  final String slug;
  final String name;
  final String? emoji;
  final int sortOrder;

  static ContentCategory? tryParse(dynamic raw) {
    if (raw == null) return null;
    if (raw is List) {
      if (raw.isEmpty) return null;
      return ContentCategory.fromJson(
        Map<String, dynamic>.from(raw.first as Map),
      );
    }
    if (raw is Map) {
      return ContentCategory.fromJson(Map<String, dynamic>.from(raw));
    }
    return null;
  }

  factory ContentCategory.fromJson(Map<String, dynamic> json) =>
      ContentCategory(
        id: json['id'] as String,
        kind: json['kind'] as String? ?? '',
        slug: json['slug'] as String? ?? '',
        name: json['name'] as String? ?? '',
        emoji: json['emoji'] as String?,
        sortOrder: json['sort_order'] as int? ?? 0,
      );
}

class AdBanner {
  AdBanner({
    required this.id,
    required this.brandName,
    required this.title,
    this.body,
    this.ctaLabel,
    this.ctaUrl,
    this.imageUrl,
    this.background,
    this.offerStartsAt,
    this.offerEndsAt,
    this.createdAt,
    this.category,
  });

  final String id;
  final String brandName;
  final String title;
  final String? body;
  final String? ctaLabel;
  final String? ctaUrl;
  final String? imageUrl;
  final String? background;
  final DateTime? offerStartsAt;
  final DateTime? offerEndsAt;
  final DateTime? createdAt;
  final ContentCategory? category;

  factory AdBanner.fromJson(Map<String, dynamic> json) => AdBanner(
    id: json['id'] as String,
    brandName: json['brand_name'] as String? ?? '',
    title: json['title'] as String? ?? '',
    body: json['body'] as String?,
    ctaLabel: json['cta_label'] as String?,
    ctaUrl: json['cta_url'] as String?,
    imageUrl: json['image_url'] as String?,
    background: json['background'] as String?,
    offerStartsAt: json['offer_starts_at'] != null
        ? DateTime.tryParse(json['offer_starts_at'] as String)
        : null,
    offerEndsAt: json['offer_ends_at'] != null
        ? DateTime.tryParse(json['offer_ends_at'] as String)
        : null,
    createdAt: json['created_at'] != null
        ? DateTime.tryParse(json['created_at'] as String)
        : null,
    category: ContentCategory.tryParse(
      json['category'] ?? json['content_categories'],
    ),
  );
}

class AreaNotice {
  AreaNotice({
    required this.id,
    required this.title,
    this.body,
    this.imageUrl,
    this.ctaLabel,
    this.ctaUrl,
    this.eventStartsAt,
    this.eventEndsAt,
    this.createdAt,
    this.category,
  });

  final String id;
  final String title;
  final String? body;
  final String? imageUrl;
  final String? ctaLabel;
  final String? ctaUrl;
  final DateTime? eventStartsAt;
  final DateTime? eventEndsAt;
  final DateTime? createdAt;
  final ContentCategory? category;

  factory AreaNotice.fromJson(Map<String, dynamic> json) => AreaNotice(
    id: json['id'] as String,
    title: json['title'] as String? ?? '',
    body: json['body'] as String?,
    imageUrl: json['image_url'] as String?,
    ctaLabel: json['cta_label'] as String?,
    ctaUrl: json['cta_url'] as String?,
    eventStartsAt: json['event_starts_at'] != null
        ? DateTime.tryParse(json['event_starts_at'] as String)
        : null,
    eventEndsAt: json['event_ends_at'] != null
        ? DateTime.tryParse(json['event_ends_at'] as String)
        : null,
    createdAt: json['created_at'] != null
        ? DateTime.tryParse(json['created_at'] as String)
        : null,
    category: ContentCategory.tryParse(
      json['category'] ?? json['content_categories'],
    ),
  );
}

/// Offer image: use images around **2.4:1** (e.g. 1200×500 px).
const adBannerHeight = 188.0;
const adBannerRadius = 12.0;
const adBannerAspectRatio = 2.4;
const adCarouselInterval = Duration(seconds: 2);

class AppVersionInfo {
  AppVersionInfo({
    required this.id,
    required this.platform,
    required this.latestVersion,
    required this.minimumVersion,
    required this.downloadUrl,
    this.releaseNotes,
  });

  final String id;
  final String platform;
  final String latestVersion;
  final String minimumVersion;
  final String downloadUrl;
  final String? releaseNotes;

  factory AppVersionInfo.fromJson(Map<String, dynamic> json) => AppVersionInfo(
    id: json['id'] as String,
    platform: json['platform'] as String? ?? '',
    latestVersion: json['latest_version'] as String? ?? '',
    minimumVersion: json['minimum_version'] as String? ?? '',
    downloadUrl: json['download_url'] as String? ?? '',
    releaseNotes: json['release_notes'] as String?,
  );
}
