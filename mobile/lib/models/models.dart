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
  });

  final String id;
  final String slug;
  final String name;
  final String? emoji;
  final String groupId;
  final int sortOrder;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['id'] as String,
        slug: json['slug'] as String,
        name: json['name'] as String,
        emoji: json['emoji'] as String?,
        groupId: json['group_id'] as String,
        sortOrder: json['sort_order'] as int? ?? 0,
      );
}

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
    this.rating = 4.5,
    this.jobsDone = 0,
    this.responseRate = 90,
    this.category,
    this.providerName,
    this.phone,
    this.address,
    this.lat,
    this.lng,
  });

  final String id;
  final String name;
  final String ownerId;
  final double rating;
  final int jobsDone;
  final int responseRate;
  final Category? category;
  final String? providerName;
  final String? phone;
  final String? address;
  final double? lat;
  final double? lng;

  factory Business.fromJson(Map<String, dynamic> json) {
    final cat = json['categories'];
    return Business(
      id: json['id'] as String,
      name: json['name'] as String,
      ownerId: json['owner_id'] as String? ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 4.5,
      jobsDone: json['jobs_done'] as int? ?? 0,
      responseRate: json['response_rate'] as int? ?? 90,
      providerName: json['providerName'] as String? ?? json['provider_name'] as String?,
      phone: json['phone'] as String?,
      address: json['address'] as String?,
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      category: cat is Map<String, dynamic>
          ? Category(
              id: cat['id'] as String,
              slug: cat['slug'] as String? ?? '',
              name: cat['name'] as String? ?? '',
              emoji: cat['emoji'] as String?,
              groupId: cat['group_id'] as String? ?? '',
            )
          : null,
    );
  }

  Business copyWith({
    String? providerName,
    String? phone,
    String? address,
    double? lat,
    double? lng,
  }) {
    return Business(
      id: id,
      name: name,
      ownerId: ownerId,
      rating: rating,
      jobsDone: jobsDone,
      responseRate: responseRate,
      category: category,
      providerName: providerName ?? this.providerName,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
    );
  }
}

class Job {
  Job({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.pincode,
    required this.createdAt,
    this.locality,
    this.area,
    this.areaId,
    this.budgetMin,
    this.budgetMax,
    this.urgency,
    this.category,
    this.customerId,
    this.updatedAt,
    this.closedWithBusinessId,
  });

  final String id;
  final String title;
  final String description;
  final String status;
  final String pincode;
  final String? locality;
  final String? area;
  final String? areaId;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final int? budgetMin;
  final int? budgetMax;
  final String? urgency;
  final Category? category;
  final String? customerId;
  final String? closedWithBusinessId;

  factory Job.fromJson(Map<String, dynamic> json) {
    final cat = json['categories'];
    return Job(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? 'open',
      pincode: json['pincode'] as String? ?? '',
      locality: json['locality'] as String?,
      area: json['area'] as String?,
      areaId: json['area_id'] as String?,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updated_at'] as String? ?? ''),
      budgetMin: json['budget_min'] as int?,
      budgetMax: json['budget_max'] as int?,
      urgency: json['urgency'] as String?,
      customerId: json['customer_id'] as String?,
      closedWithBusinessId: json['closed_with_business_id'] as String?,
      category: cat is Map<String, dynamic>
          ? Category(
              id: cat['id'] as String,
              slug: cat['slug'] as String? ?? '',
              name: cat['name'] as String? ?? '',
              emoji: cat['emoji'] as String?,
              groupId: cat['group_id'] as String? ?? '',
            )
          : null,
    );
  }

  String get budgetLabel {
    if (budgetMin == null && budgetMax == null) return 'Flexible';
    if (budgetMin != null && budgetMax != null) {
      if (budgetMin == budgetMax) return '₹$budgetMin';
      return '₹$budgetMin–$budgetMax';
    }
    if (budgetMin != null) return 'From ₹$budgetMin';
    return 'Up to ₹$budgetMax';
  }
}

class JobInterest {
  JobInterest({
    required this.id,
    required this.status,
    this.offeredAmount,
    this.businessId,
    this.businessName,
    this.businessRating,
    this.categoryName,
    this.ownerId,
    this.ownerName,
    this.ownerPhone,
  });

  final String id;
  final String status;
  final int? offeredAmount;
  final String? businessId;
  final String? businessName;
  final double? businessRating;
  final String? categoryName;
  final String? ownerId;
  final String? ownerName;
  final String? ownerPhone;
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
      );
}

/// Home carousel banner: ~148px tall; use images around **2.4:1** (e.g. 1200×500 px).
const adBannerHeight = 188.0;
const adBannerRadius = 12.0;
const adBannerAspectRatio = 2.4;
