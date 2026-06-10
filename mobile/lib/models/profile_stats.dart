class ProfileStats {
  const ProfileStats({
    this.respect = 0,
    this.wallet = 0,
    this.readStreak = 0,
    this.followers = 0,
    this.following = 0,
  });

  final int respect;
  final int wallet;
  final int readStreak;
  final int followers;
  final int following;

  static const zero = ProfileStats();

  factory ProfileStats.fromJson(Map<String, dynamic> json) {
    final readStreakRaw = json['readStreak'];
    var streakCurrent = 0;
    if (readStreakRaw is Map<String, dynamic>) {
      final current = readStreakRaw['current'];
      if (current is num) streakCurrent = current.toInt();
    }

    int intVal(dynamic v) {
      if (v is num) return v.toInt();
      return 0;
    }

    return ProfileStats(
      respect: intVal(json['blogRespectReceivedCount']),
      wallet: 0,
      readStreak: streakCurrent,
      followers: intVal(json['followersCount']),
      following: intVal(json['followingCount']),
    );
  }
}
