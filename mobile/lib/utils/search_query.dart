import '../models/search_hit.dart';

String normalizeSearchQuery(String raw) {
  return raw.trim().replaceAll(RegExp(r'\s+'), ' ');
}

bool isSearchQueryReady(String raw) {
  return normalizeSearchQuery(raw).length >= searchMinChars;
}

int searchQueryCharCount(String raw) {
  return normalizeSearchQuery(raw).length;
}
