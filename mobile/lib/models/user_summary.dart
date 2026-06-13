import 'certification_item.dart';
import 'education_item.dart';
import 'project_item.dart';
import 'setup_item.dart';
import 'tech_stack_item.dart';
import 'work_experience_item.dart';
import '../utils/blog_streak_limits.dart';

class UserSummary {
  const UserSummary({
    required this.id,
    required this.email,
    this.fullName,
    this.username,
    this.profileImg,
    this.coverBanner,
    this.bio,
    this.portfolioUrl,
    this.linkedin,
    this.github,
    this.instagram,
    this.youtube,
    List<String>? stackAndTools,
    List<TechStackItem>? stackAndToolsDisplay,
    List<SetupItem>? mySetup,
    List<WorkExperienceItem>? workExperiences,
    List<EducationItem>? education,
    List<CertificationItem>? certifications,
    List<ProjectItem>? projects,
    bool? isGoogleAccount,
    bool? isGitAccount,
    bool? isFacebookAccount,
    bool? isXAccount,
    bool? isDiscordAccount,
    bool? isTwitchAccount,
    this.blogStreakMode,
  })  : _stackAndTools = stackAndTools,
        _stackAndToolsDisplay = stackAndToolsDisplay,
        _mySetup = mySetup,
        _workExperiences = workExperiences,
        _education = education,
        _certifications = certifications,
        _projects = projects,
        _isGoogleAccount = isGoogleAccount,
        _isGitAccount = isGitAccount,
        _isFacebookAccount = isFacebookAccount,
        _isXAccount = isXAccount,
        _isDiscordAccount = isDiscordAccount,
        _isTwitchAccount = isTwitchAccount;

  final String id;
  final String email;
  final String? fullName;
  final String? username;
  final String? profileImg;
  final String? coverBanner;
  final String? bio;
  final String? portfolioUrl;
  final String? linkedin;
  final String? github;
  final String? instagram;
  final String? youtube;
  final List<String>? _stackAndTools;
  final List<TechStackItem>? _stackAndToolsDisplay;
  final List<SetupItem>? _mySetup;
  final List<WorkExperienceItem>? _workExperiences;
  final List<EducationItem>? _education;
  final List<CertificationItem>? _certifications;
  final List<ProjectItem>? _projects;
  final bool? _isGoogleAccount;
  final bool? _isGitAccount;
  final bool? _isFacebookAccount;
  final bool? _isXAccount;
  final bool? _isDiscordAccount;
  final bool? _isTwitchAccount;
  final String? blogStreakMode;

  String get effectiveBlogStreakMode =>
      parseBlogStreakMode(blogStreakMode) ?? blogStreakModeDaily;

  /// Safe after hot reload when OAuth flags were added to an older in-memory user.
  bool get isGoogleAccount => _isGoogleAccount ?? false;
  bool get isGitAccount => _isGitAccount ?? false;
  bool get isFacebookAccount => _isFacebookAccount ?? false;
  bool get isXAccount => _isXAccount ?? false;
  bool get isDiscordAccount => _isDiscordAccount ?? false;
  bool get isTwitchAccount => _isTwitchAccount ?? false;

  int get linkedOAuthProviderCount =>
      [
        isGoogleAccount,
        isGitAccount,
        isFacebookAccount,
        isXAccount,
        isDiscordAccount,
        isTwitchAccount,
      ].where((linked) => linked).length;

  /// Empty when unset — safe after hot reload when the field was added later.
  List<String> get stackAndTools => _stackAndTools ?? const [];

  List<TechStackItem> get stackAndToolsDisplay => _stackAndToolsDisplay ?? const [];

  List<SetupItem> get mySetup => _mySetup ?? const [];

  List<WorkExperienceItem> get workExperiences => _workExperiences ?? const [];

  List<EducationItem> get education => _education ?? const [];

  List<CertificationItem> get certifications => _certifications ?? const [];

  List<ProjectItem> get projects => _projects ?? const [];

  String get displayName =>
      (fullName?.trim().isNotEmpty == true)
          ? fullName!.trim()
          : (username?.trim().isNotEmpty == true)
          ? username!.trim()
          : email;

  static String? _optionalString(dynamic value) {
    if (value == null) return null;
    if (value is String) return value;
    return value.toString();
  }

  factory UserSummary.fromJson(Map<String, dynamic> json) {
    return UserSummary(
      id: _optionalString(json['_id'] ?? json['id']) ?? '',
      email: _optionalString(json['email']) ?? '',
      fullName: _optionalString(json['fullName']),
      username: _optionalString(json['username']),
      profileImg: _optionalString(json['profileImg']),
      coverBanner: _optionalString(json['coverBanner']),
      bio: _optionalString(json['bio']),
      portfolioUrl: _optionalString(json['portfolioUrl']),
      linkedin: _optionalString(json['linkedin']),
      github: _optionalString(json['github']),
      instagram: _optionalString(json['instagram']),
      youtube: _optionalString(json['youtube']),
      stackAndTools: _stringList(json['stackAndTools']),
      stackAndToolsDisplay: _techStackItems(json['stackAndToolsDisplay']),
      mySetup: _setupItems(json['mySetup']),
      workExperiences: _parseWorkExperiences(json['workExperiences']),
      education: _parseEducationItems(json['education']),
      certifications: _parseCertificationItems(json['certifications']),
      projects: _parseProjectItems(json['projects']),
      isGoogleAccount: json['isGoogleAccount'] == true,
      isGitAccount: json['isGitAccount'] == true,
      isFacebookAccount: json['isFacebookAccount'] == true,
      isXAccount: json['isXAccount'] == true,
      isDiscordAccount: json['isDiscordAccount'] == true,
      isTwitchAccount: json['isTwitchAccount'] == true,
      blogStreakMode: parseBlogStreakMode(json['blogStreakMode']),
    );
  }

  static List<SetupItem> _setupItems(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map<String, dynamic>>()
        .map(SetupItem.fromJson)
        .where((item) => item.label.isNotEmpty && item.imageUrl.isNotEmpty)
        .toList();
  }

  static List<WorkExperienceItem> _parseWorkExperiences(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map<String, dynamic>>()
        .map(WorkExperienceItem.fromJson)
        .where((item) => item.jobTitle.isNotEmpty && item.company.isNotEmpty)
        .toList();
  }

  static List<EducationItem> _parseEducationItems(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map<String, dynamic>>()
        .map(EducationItem.fromJson)
        .where((item) => item.school.isNotEmpty && item.degree.isNotEmpty)
        .toList();
  }

  static List<CertificationItem> _parseCertificationItems(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map<String, dynamic>>()
        .map(CertificationItem.fromJson)
        .where((item) => item.name.isNotEmpty && item.issuingOrganization.isNotEmpty)
        .toList();
  }

  static List<ProjectItem> _parseProjectItems(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map<String, dynamic>>()
        .map(ProjectItem.fromJson)
        .where((item) => item.title.isNotEmpty)
        .toList();
  }

  static List<String> _stringList(dynamic value) {
    if (value is! List) return const [];
    return value.map((e) => e.toString().trim()).where((s) => s.isNotEmpty).toList();
  }

  static List<TechStackItem> _techStackItems(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map<String, dynamic>>()
        .map(TechStackItem.fromJson)
        .where((item) => item.name.isNotEmpty)
        .toList();
  }
}
