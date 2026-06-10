class NotificationPreferences {
  const NotificationPreferences({
    this.inAppEnabled = true,
    this.milestonesEnabled = true,
    this.followingEnabled = true,
    this.trendingEnabled = true,
    this.settingsEnabled = true,
    this.referralsEnabled = true,
    this.squadsEnabled = true,
    this.categoriesEnabled = true,
    this.tagsEnabled = true,
    this.achievementsEnabled = true,
  });

  factory NotificationPreferences.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const NotificationPreferences();
    return NotificationPreferences(
      inAppEnabled: json['inAppEnabled'] != false,
      milestonesEnabled: json['milestonesEnabled'] != false,
      followingEnabled: json['followingEnabled'] != false,
      trendingEnabled: json['trendingEnabled'] != false,
      settingsEnabled: json['settingsEnabled'] != false,
      referralsEnabled: json['referralsEnabled'] != false,
      squadsEnabled: json['squadsEnabled'] != false,
      categoriesEnabled: json['categoriesEnabled'] != false,
      tagsEnabled: json['tagsEnabled'] != false,
      achievementsEnabled: json['achievementsEnabled'] != false,
    );
  }

  final bool inAppEnabled;
  final bool milestonesEnabled;
  final bool followingEnabled;
  final bool trendingEnabled;
  final bool settingsEnabled;
  final bool referralsEnabled;
  final bool squadsEnabled;
  final bool categoriesEnabled;
  final bool tagsEnabled;
  final bool achievementsEnabled;

  bool valueForKey(String key) => switch (key) {
        notificationPrefKeyInApp => inAppEnabled,
        notificationPrefKeyMilestones => milestonesEnabled,
        notificationPrefKeyFollowing => followingEnabled,
        notificationPrefKeyTrending => trendingEnabled,
        notificationPrefKeySettings => settingsEnabled,
        notificationPrefKeyReferrals => referralsEnabled,
        notificationPrefKeySquads => squadsEnabled,
        notificationPrefKeyCategories => categoriesEnabled,
        notificationPrefKeyTags => tagsEnabled,
        notificationPrefKeyAchievements => achievementsEnabled,
        _ => true,
      };

  NotificationPreferences withKey(String key, bool value) => switch (key) {
        notificationPrefKeyInApp => copyWith(inAppEnabled: value),
        notificationPrefKeyMilestones => copyWith(milestonesEnabled: value),
        notificationPrefKeyFollowing => copyWith(followingEnabled: value),
        notificationPrefKeyTrending => copyWith(trendingEnabled: value),
        notificationPrefKeySettings => copyWith(settingsEnabled: value),
        notificationPrefKeyReferrals => copyWith(referralsEnabled: value),
        notificationPrefKeySquads => copyWith(squadsEnabled: value),
        notificationPrefKeyCategories => copyWith(categoriesEnabled: value),
        notificationPrefKeyTags => copyWith(tagsEnabled: value),
        notificationPrefKeyAchievements => copyWith(achievementsEnabled: value),
        _ => this,
      };

  NotificationPreferences copyWith({
    bool? inAppEnabled,
    bool? milestonesEnabled,
    bool? followingEnabled,
    bool? trendingEnabled,
    bool? settingsEnabled,
    bool? referralsEnabled,
    bool? squadsEnabled,
    bool? categoriesEnabled,
    bool? tagsEnabled,
    bool? achievementsEnabled,
  }) {
    return NotificationPreferences(
      inAppEnabled: inAppEnabled ?? this.inAppEnabled,
      milestonesEnabled: milestonesEnabled ?? this.milestonesEnabled,
      followingEnabled: followingEnabled ?? this.followingEnabled,
      trendingEnabled: trendingEnabled ?? this.trendingEnabled,
      settingsEnabled: settingsEnabled ?? this.settingsEnabled,
      referralsEnabled: referralsEnabled ?? this.referralsEnabled,
      squadsEnabled: squadsEnabled ?? this.squadsEnabled,
      categoriesEnabled: categoriesEnabled ?? this.categoriesEnabled,
      tagsEnabled: tagsEnabled ?? this.tagsEnabled,
      achievementsEnabled: achievementsEnabled ?? this.achievementsEnabled,
    );
  }
}

const notificationPrefKeyInApp = 'inAppEnabled';
const notificationPrefKeyMilestones = 'milestonesEnabled';
const notificationPrefKeyFollowing = 'followingEnabled';
const notificationPrefKeyTrending = 'trendingEnabled';
const notificationPrefKeySettings = 'settingsEnabled';
const notificationPrefKeyReferrals = 'referralsEnabled';
const notificationPrefKeySquads = 'squadsEnabled';
const notificationPrefKeyCategories = 'categoriesEnabled';
const notificationPrefKeyTags = 'tagsEnabled';
const notificationPrefKeyAchievements = 'achievementsEnabled';

const notificationCategoryPrefKeys = [
  notificationPrefKeyMilestones,
  notificationPrefKeyAchievements,
  notificationPrefKeyFollowing,
  notificationPrefKeyCategories,
  notificationPrefKeyTags,
  notificationPrefKeySquads,
  notificationPrefKeyTrending,
  notificationPrefKeyReferrals,
  notificationPrefKeySettings,
];
