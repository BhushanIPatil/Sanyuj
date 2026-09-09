class Profile {
  Profile({
    required this.id,
    this.email,
    this.phone,
    this.fullName,
    this.pincode,
    this.locality,
    this.localityId,
    this.area,
    this.areaId,
    this.address,
    this.currentAddress,
    this.lat,
    this.lng,
    this.onboardingComplete = false,
  });

  final String id;
  final String? email;
  final String? phone;
  final String? fullName;
  final String? pincode;
  final String? locality;
  final String? localityId;
  final String? area;
  final String? areaId;
  final String? address;
  final String? currentAddress;
  final double? lat;
  final double? lng;
  final bool onboardingComplete;

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
        id: json['id'] as String,
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        fullName: json['full_name'] as String?,
        pincode: json['pincode'] as String?,
        locality: json['locality'] as String?,
        localityId: json['locality_id'] as String?,
        area: json['area'] as String?,
        areaId: json['area_id'] as String?,
        address: json['address'] as String?,
        currentAddress: json['current_address'] as String?,
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
        onboardingComplete: json['onboarding_complete'] as bool? ?? false,
      );
}

class Category {
  Category({
    required this.id,
    required this.slug,
    required this.name,
    this.emoji,
    required this.groupId,
    this.sortOrder = 0,
    this.isOther = false,
  });

  final String id;
  final String slug;
  final String name;
  final String? emoji;
  final String groupId;
  final int sortOrder;
  final bool isOther;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as String,
        slug: json['slug'] as String? ?? '',
        name: json['name'] as String? ?? '',
        emoji: json['emoji'] as String?,
        groupId: json['group_id'] as String? ?? '',
        sortOrder: json['sort_order'] as int? ?? 0,
        isOther: json['is_other'] as bool? ?? false,
      );
}

const kOtherCategoryId = '__other__';
const kOtherCategorySlug = 'other';

final kOtherBrowseCategory = Category(
  id: kOtherCategoryId,
  slug: kOtherCategorySlug,
  name: 'Other',
  emoji: '✨',
  groupId: '',
  sortOrder: 999,
  isOther: true,
);

class CategoryGroup {
  CategoryGroup({
    required this.id,
    required this.slug,
    required this.name,
    required this.categories,
    this.sortOrder = 0,
  });

  final String id;
  final String slug;
  final String name;
  final List<Category> categories;
  final int sortOrder;
}

class Business {
  Business({
    required this.id,
    required this.name,
    required this.ownerId,
    this.photoUrl,
    this.responseRate = 0,
    this.category,
    this.providerName,
    this.phone,
    this.address,
    this.lat,
    this.lng,
    this.createdAt,
  });

  final String id;
  final String name;
  final String ownerId;
  final String? photoUrl;
  final int responseRate;
  final Category? category;
  final String? providerName;
  final String? phone;
  final String? address;
  final double? lat;
  final double? lng;
  final DateTime? createdAt;

  factory Business.fromJson(Map<String, dynamic> json) {
    final cat = json['categories'];
    return Business(
      id: json['id'] as String,
      name: json['name'] as String,
      ownerId: json['owner_id'] as String? ?? '',
      photoUrl: json['photo_url'] as String?,
      responseRate: json['response_rate'] as int? ?? 0,
      providerName: json['providerName'] as String? ?? json['provider_name'] as String?,
      phone: json['phone'] as String?,
      address: json['address'] as String?,
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      category: cat is Map<String, dynamic>
          ? Category(
              id: cat['id'] as String,
              slug: cat['slug'] as String? ?? '',
              name: cat['name'] as String? ?? '',
              emoji: cat['emoji'] as String?,
              groupId: cat['group_id'] as String? ?? '',
              isOther: cat['is_other'] as bool? ?? false,
            )
          : null,
    );
  }

  Business copyWith({
    String? name,
    String? photoUrl,
    bool clearPhotoUrl = false,
    Category? category,
    String? providerName,
    String? phone,
    String? address,
    double? lat,
    double? lng,
  }) {
    return Business(
      id: id,
      name: name ?? this.name,
      ownerId: ownerId,
      photoUrl: clearPhotoUrl ? null : (photoUrl ?? this.photoUrl),
      responseRate: responseRate,
      category: category ?? this.category,
      providerName: providerName ?? this.providerName,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      createdAt: createdAt,
    );
  }
}

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

  Category get asChip => Category(
        id: id,
        slug: slug,
        name: name,
        emoji: emoji,
        groupId: '',
        sortOrder: sortOrder,
      );

  static ContentCategory? tryParse(dynamic raw) {
    if (raw == null) return null;
    if (raw is List) {
      if (raw.isEmpty) return null;
      return ContentCategory.fromJson(Map<String, dynamic>.from(raw.first as Map));
    }
    if (raw is Map) return ContentCategory.fromJson(Map<String, dynamic>.from(raw));
    return null;
  }

  factory ContentCategory.fromJson(Map<String, dynamic> json) => ContentCategory(
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
        category: ContentCategory.tryParse(json['category'] ?? json['content_categories']),
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
        category: ContentCategory.tryParse(json['category'] ?? json['content_categories']),
      );
}

/// Home carousel banner: ~148px tall; use images around **2.4:1** (e.g. 1200×500 px).
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
