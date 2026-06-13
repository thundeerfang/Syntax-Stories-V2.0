import '../models/user_summary.dart';
import '../services/oauth_urls.dart';

/// Settings connected-account rows — mirrors webapp `ConnectedAccountsSection`.
const kConnectedAccountProviders = <({OAuthProvider provider, String title})>[
  (provider: OAuthProvider.google, title: 'Google Cloud'),
  (provider: OAuthProvider.github, title: 'GitHub Source'),
  (provider: OAuthProvider.x, title: 'X (Twitter)'),
  (provider: OAuthProvider.facebook, title: 'Meta / FB'),
  (provider: OAuthProvider.discord, title: 'Discord'),
];

bool connectedProviderIsLinked(OAuthProvider provider, UserSummary user) {
  return switch (provider) {
    OAuthProvider.google => user.isGoogleAccount,
    OAuthProvider.github => user.isGitAccount,
    OAuthProvider.x => user.isXAccount,
    OAuthProvider.facebook => user.isFacebookAccount,
    OAuthProvider.discord => user.isDiscordAccount,
    OAuthProvider.twitch => user.isTwitchAccount,
  };
}

int countLinkedConnectedProviders(UserSummary user) {
  var count = 0;
  for (final row in kConnectedAccountProviders) {
    if (connectedProviderIsLinked(row.provider, user)) count++;
  }
  return count;
}
