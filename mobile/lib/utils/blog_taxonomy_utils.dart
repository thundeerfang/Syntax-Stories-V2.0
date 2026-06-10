const blogMaxTags = 20;
const blogTagMaxLen = 32;
const blogCategoryMaxLen = 48;

String normalizeBlogTag(String raw) {
  var tag = raw
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'\s+'), '-')
      .replaceAll(RegExp(r'[^\w-]'), '')
      .replaceAll(RegExp(r'-+'), '-')
      .replaceAll(RegExp(r'^-+'), '')
      .replaceAll(RegExp(r'-+$'), '');
  if (tag.isEmpty) return '';
  if (tag.length > blogTagMaxLen) tag = tag.substring(0, blogTagMaxLen);
  return tag;
}

String normalizeBlogCategory(String raw) {
  final slug = raw
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'\s+'), '-')
      .replaceAll(RegExp(r'[^\w-]'), '')
      .replaceAll(RegExp(r'-+'), '-')
      .replaceAll(RegExp(r'^-+'), '')
      .replaceAll(RegExp(r'-+$'), '');
  if (slug.isEmpty) return '';
  return slug.length <= blogCategoryMaxLen ? slug : slug.substring(0, blogCategoryMaxLen);
}

List<String> addBlogTag(List<String> current, String raw) {
  final tag = normalizeBlogTag(raw);
  if (tag.isEmpty || current.contains(tag) || current.length >= blogMaxTags) {
    return current;
  }
  return [...current, tag];
}
