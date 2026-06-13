class SetupItem {
  const SetupItem({
    required this.label,
    required this.imageUrl,
    this.productUrl,
    this.imageAlt,
  });

  factory SetupItem.fromJson(Map<String, dynamic> json) {
    return SetupItem(
      label: json['label']?.toString().trim() ?? '',
      imageUrl: json['imageUrl']?.toString().trim() ?? '',
      productUrl: json['productUrl']?.toString().trim(),
      imageAlt: json['imageAlt']?.toString().trim(),
    );
  }

  final String label;
  final String imageUrl;
  final String? productUrl;
  final String? imageAlt;

  Map<String, dynamic> toJson() {
    final product = productUrl?.trim();
    final alt = imageAlt?.trim();
    return {
      'label': label.trim(),
      'imageUrl': imageUrl.trim(),
      if (product != null && product.isNotEmpty) 'productUrl': product,
      if (alt != null && alt.isNotEmpty) 'imageAlt': alt,
    };
  }

  SetupItem copyWith({
    String? label,
    String? imageUrl,
    String? productUrl,
    String? imageAlt,
  }) {
    return SetupItem(
      label: label ?? this.label,
      imageUrl: imageUrl ?? this.imageUrl,
      productUrl: productUrl ?? this.productUrl,
      imageAlt: imageAlt ?? this.imageAlt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! SetupItem) return false;
    return label.trim() == other.label.trim() &&
        imageUrl.trim() == other.imageUrl.trim() &&
        (productUrl ?? '').trim() == (other.productUrl ?? '').trim() &&
        (imageAlt ?? '').trim() == (other.imageAlt ?? '').trim();
  }

  @override
  int get hashCode => Object.hash(label, imageUrl, productUrl, imageAlt);
}
