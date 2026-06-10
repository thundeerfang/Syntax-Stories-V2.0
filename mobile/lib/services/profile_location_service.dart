import 'package:country_state_city/country_state_city.dart' as csc;

/// One selectable location row — mirrors webapp SearchableSelectOption.
class ProfileLocationOption {
  const ProfileLocationOption({required this.value, required this.label});

  final String value;
  final String label;
}

/// Country / state / city helpers — same contract as webapp `profileLocation.ts`.
class ProfileLocationService {
  ProfileLocationService._();

  static final ProfileLocationService instance = ProfileLocationService._();

  List<csc.Country>? _countriesCache;

  Future<List<csc.Country>> _countries() async {
    _countriesCache ??= await csc.getAllCountries();
    return _countriesCache!;
  }

  Future<List<ProfileLocationOption>> getCountryOptions() async {
    final list = await _countries();
    return list.map((c) => ProfileLocationOption(value: c.isoCode, label: c.name)).toList()
      ..sort((a, b) => a.label.compareTo(b.label));
  }

  Future<List<ProfileLocationOption>> getStateOptions(String countryCode) async {
    if (countryCode.trim().isEmpty) return const [];
    final list = await csc.getStatesOfCountry(countryCode);
    return list.map((s) => ProfileLocationOption(value: s.isoCode, label: s.name)).toList()
      ..sort((a, b) => a.label.compareTo(b.label));
  }

  Future<List<ProfileLocationOption>> getCityOptions(String countryCode, String stateCode) async {
    if (countryCode.trim().isEmpty) return const [];
    final List<csc.City> list;
    if (stateCode.trim().isNotEmpty) {
      list = await csc.getStateCities(countryCode, stateCode);
    } else {
      list = await csc.getCountryCities(countryCode);
    }
    return list.map((c) => ProfileLocationOption(value: c.name, label: c.name)).toList()
      ..sort((a, b) => a.label.compareTo(b.label));
  }

  Future<String> countryLabel(String countryCode) async {
    if (countryCode.trim().isEmpty) return '';
    final country = await csc.getCountryFromCode(countryCode);
    return country?.name ?? countryCode;
  }

  Future<String> stateLabel(String countryCode, String stateCode) async {
    if (countryCode.trim().isEmpty || stateCode.trim().isEmpty) return '';
    final state = await csc.getStateByCode(countryCode, stateCode);
    return state?.name ?? stateCode;
  }

  /// Build backend `location` string: "City, State, Country".
  Future<String> buildLocationString({
    required String city,
    required String stateCode,
    required String countryCode,
  }) async {
    if (countryCode.trim().isEmpty && stateCode.trim().isEmpty && city.trim().isEmpty) {
      return '';
    }
    final countryName = await countryLabel(countryCode);
    var stateName = stateCode.trim();
    if (countryCode.trim().isNotEmpty && stateCode.trim().isNotEmpty) {
      stateName = await stateLabel(countryCode, stateCode);
    }
    final parts = [city.trim(), stateName, countryName].where((p) => p.isNotEmpty).toList();
    return parts.join(', ');
  }

  /// Parse stored backend location into picker codes/names.
  Future<({String city, String stateCode, String countryCode})> parseLocationString(
    String? location,
  ) async {
    final trimmed = location?.trim() ?? '';
    if (trimmed.isEmpty) {
      return (city: '', stateCode: '', countryCode: '');
    }

    final parts = trimmed.split(',').map((p) => p.trim()).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return (city: '', stateCode: '', countryCode: '');

    final countries = await _countries();

    if (parts.length == 1) {
      return _parseOnePart(parts[0], countries);
    }
    if (parts.length == 2) {
      return _parseTwoParts(parts[0], parts[1], countries);
    }
    return _parseThreeOrMore(parts, countries);
  }

  ({String city, String stateCode, String countryCode}) _parseOnePart(
    String part,
    List<csc.Country> countries,
  ) {
    for (final c in countries) {
      if (c.name == part) return (city: '', stateCode: '', countryCode: c.isoCode);
    }
    return (city: part, stateCode: '', countryCode: '');
  }

  ({String city, String stateCode, String countryCode}) _parseTwoParts(
    String first,
    String last,
    List<csc.Country> countries,
  ) {
    for (final c in countries) {
      if (c.name == last) return (city: first, stateCode: '', countryCode: c.isoCode);
    }
    return (city: first, stateCode: '', countryCode: last);
  }

  Future<({String city, String stateCode, String countryCode})> _parseThreeOrMore(
    List<String> parts,
    List<csc.Country> countries,
  ) async {
    final last = parts.last;
    for (final c in countries) {
      if (c.name != last) continue;
      final statePart = parts.length >= 2 ? parts[parts.length - 2] : '';
      final states = await csc.getStatesOfCountry(c.isoCode);
      for (final s in states) {
        if (s.name == statePart) {
          return (
            city: parts.sublist(0, parts.length - 2).join(', '),
            stateCode: s.isoCode,
            countryCode: c.isoCode,
          );
        }
      }
      return (
        city: parts.sublist(0, parts.length - 1).join(', '),
        stateCode: '',
        countryCode: c.isoCode,
      );
    }
    return (
      city: parts.isNotEmpty ? parts[0] : '',
      stateCode: parts.length > 1 ? parts[1] : '',
      countryCode: parts.length > 2 ? parts[2] : '',
    );
  }
}
