import '../config/api_config.dart';

/// Same deep-link return origin as desktop (`syntaxstories://app`).
const mobileOAuthReturnOrigin = 'syntaxstories://app';

enum OAuthProvider {
  google('/auth/google', 'assets/icons/google.svg'),
  facebook('/auth/facebook', 'assets/icons/facebook.svg'),
  github('/auth/github', 'assets/icons/github.svg'),
  discord('/auth/discord', 'assets/icons/discord.svg'),
  x('/auth/x', 'assets/icons/x.svg'),
  twitch('/auth/twitch', 'assets/icons/twitch.svg');

  const OAuthProvider(this.pathPrefix, this.iconAsset);
  final String pathPrefix;
  final String iconAsset;

  String get label => switch (this) {
        OAuthProvider.google => 'Google',
        OAuthProvider.facebook => 'Facebook',
        OAuthProvider.github => 'GitHub',
        OAuthProvider.discord => 'Discord',
        OAuthProvider.x => 'X.com',
        OAuthProvider.twitch => 'Twitch',
      };
}

class OAuthUrls {
  OAuthUrls({String? baseUrl}) : _baseUrlOverride = baseUrl;

  final String? _baseUrlOverride;

  String get _base => (_baseUrlOverride ?? resolveApiBaseUrl()).replaceAll(RegExp(r'/+$'), '');

  String login(OAuthProvider provider) => _start('${provider.pathPrefix}/login');

  String signup(OAuthProvider provider, {String? referralCode}) {
    var href = _start('${provider.pathPrefix}/signup');
    final ref = referralCode?.trim();
    if (ref != null && ref.isNotEmpty) {
      final uri = Uri.parse(href);
      href = uri.replace(queryParameters: {...uri.queryParameters, 'ref': ref}).toString();
    }
    return href;
  }

  String _start(String path) {
    final uri = Uri.parse('$_base$path').replace(
      queryParameters: {'frontendOrigin': mobileOAuthReturnOrigin},
    );
    return uri.toString();
  }

  /// Append mobile deep-link return origin (settings OAuth link flow).
  static String withMobileReturnOrigin(String href) {
    final uri = Uri.parse(href);
    return uri
        .replace(
          queryParameters: {
            ...uri.queryParameters,
            'frontendOrigin': mobileOAuthReturnOrigin,
          },
        )
        .toString();
  }
}
