/// Alt text for company/school logos — derived from the gallery file name (no extension).
String? logoAltFromChosenFileName(String? fileName, {int maxLength = 120}) {
  var name = fileName?.trim() ?? '';
  if (name.isEmpty) return null;
  final dot = name.lastIndexOf('.');
  if (dot > 0) name = name.substring(0, dot);
  name = name.trim();
  if (name.isEmpty) return null;
  return name.length > maxLength ? name.substring(0, maxLength) : name;
}
