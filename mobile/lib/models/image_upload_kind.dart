/// Shared upload/crop presets — cover, avatar, setup, logos, and work media.
enum ImageUploadKind { cover, avatar, setupComponent, companyLogo, schoolLogo, orgLogo, workMedia }

extension ImageUploadKindConfig on ImageUploadKind {
  double get aspectRatio => switch (this) {
        ImageUploadKind.cover => 4,
        ImageUploadKind.avatar => 1,
        ImageUploadKind.setupComponent => 16 / 9,
        ImageUploadKind.companyLogo => 1,
        ImageUploadKind.schoolLogo => 1,
        ImageUploadKind.orgLogo => 1,
        ImageUploadKind.workMedia => 1,
      };

  double get cropViewportHeight => switch (this) {
        ImageUploadKind.cover => 200,
        ImageUploadKind.avatar => 260,
        ImageUploadKind.setupComponent => 200,
        ImageUploadKind.companyLogo => 220,
        ImageUploadKind.schoolLogo => 220,
        ImageUploadKind.orgLogo => 220,
        ImageUploadKind.workMedia => 220,
      };

  int get maxSizeBytes => switch (this) {
        ImageUploadKind.cover => 10 * 1024 * 1024,
        ImageUploadKind.avatar => 5 * 1024 * 1024,
        ImageUploadKind.setupComponent => 5 * 1024 * 1024,
        ImageUploadKind.companyLogo => 5 * 1024 * 1024,
        ImageUploadKind.schoolLogo => 5 * 1024 * 1024,
        ImageUploadKind.orgLogo => 5 * 1024 * 1024,
        ImageUploadKind.workMedia => 5 * 1024 * 1024,
      };

  String get maxSizeLabel => switch (this) {
        ImageUploadKind.cover => '10 MB',
        ImageUploadKind.avatar => '5 MB',
        ImageUploadKind.setupComponent => '5 MB',
        ImageUploadKind.companyLogo => '5 MB',
        ImageUploadKind.schoolLogo => '5 MB',
        ImageUploadKind.orgLogo => '5 MB',
        ImageUploadKind.workMedia => '5 MB',
      };

  String get aspectLabel => switch (this) {
        ImageUploadKind.cover => '4∶1',
        ImageUploadKind.avatar => '1∶1',
        ImageUploadKind.setupComponent => '16∶9',
        ImageUploadKind.companyLogo => '1∶1',
        ImageUploadKind.schoolLogo => '1∶1',
        ImageUploadKind.orgLogo => '1∶1',
        ImageUploadKind.workMedia => '1∶1',
      };

  String get dialogTitle => switch (this) {
        ImageUploadKind.cover => 'UPLOAD COVER',
        ImageUploadKind.avatar => 'UPLOAD PROFILE PHOTO',
        ImageUploadKind.setupComponent => 'UPLOAD COMPONENT IMAGE',
        ImageUploadKind.companyLogo => 'UPLOAD COMPANY LOGO',
        ImageUploadKind.schoolLogo => 'UPLOAD SCHOOL LOGO',
        ImageUploadKind.orgLogo => 'UPLOAD ISSUER LOGO',
        ImageUploadKind.workMedia => 'UPLOAD WORK MEDIA',
      };

  String get pickPrompt => switch (this) {
        ImageUploadKind.cover => 'CHOOSE A COVER PICTURE',
        ImageUploadKind.avatar => 'CHOOSE A PROFILE PICTURE',
        ImageUploadKind.setupComponent => 'CHOOSE A COMPONENT IMAGE',
        ImageUploadKind.companyLogo => 'CHOOSE A COMPANY LOGO',
        ImageUploadKind.schoolLogo => 'CHOOSE A SCHOOL LOGO',
        ImageUploadKind.orgLogo => 'CHOOSE AN ISSUER LOGO',
        ImageUploadKind.workMedia => 'CHOOSE WORK MEDIA',
      };

  String get pickHint => switch (this) {
        ImageUploadKind.cover => 'Cover image will be updated',
        ImageUploadKind.avatar => 'Profile photo will be updated',
        ImageUploadKind.setupComponent => 'Component image will be attached',
        ImageUploadKind.companyLogo => 'Logo will be attached to this role',
        ImageUploadKind.schoolLogo => 'Logo will be attached to this school',
        ImageUploadKind.orgLogo => 'Logo will be attached to this certification',
        ImageUploadKind.workMedia => 'Media will be attached to this role',
      };

  String get subtitle => switch (this) {
        ImageUploadKind.companyLogo =>
          'JPEG, PNG, WebP, or iPhone photo (HEIC) · $aspectLabel crop · Max $maxSizeLabel',
        ImageUploadKind.workMedia =>
          '$aspectLabel crop · Max $maxSizeLabel',
        ImageUploadKind.schoolLogo =>
          'JPEG, PNG, WebP, or iPhone photo (HEIC) · $aspectLabel crop · Max $maxSizeLabel',
        ImageUploadKind.orgLogo =>
          'JPEG, PNG, WebP, or iPhone photo (HEIC) · $aspectLabel crop · Max $maxSizeLabel',
        _ =>
          'JPEG, PNG, GIF, WebP, or iPhone photo (HEIC) · $aspectLabel crop · Max $maxSizeLabel',
      };

  /// Client-side pick validation — profile logos (not work media).
  bool get validatesLogoPickFormat =>
      this == ImageUploadKind.companyLogo ||
      this == ImageUploadKind.schoolLogo ||
      this == ImageUploadKind.orgLogo;

  /// Post-crop size cap on device — profile logos; work media relies on server `/api/upload/media`.
  bool get enforcesMaxSizeAfterCrop =>
      this == ImageUploadKind.companyLogo ||
      this == ImageUploadKind.schoolLogo ||
      this == ImageUploadKind.orgLogo;

  String get confirmLabel => 'SAVE & UPLOAD';

  bool get patchesProfile =>
      this == ImageUploadKind.cover || this == ImageUploadKind.avatar;

  String get formField => switch (this) {
        ImageUploadKind.cover => 'cover',
        ImageUploadKind.avatar => 'avatar',
        ImageUploadKind.setupComponent => 'media',
        ImageUploadKind.companyLogo => 'logo',
        ImageUploadKind.schoolLogo => 'logo',
        ImageUploadKind.orgLogo => 'logo',
        ImageUploadKind.workMedia => 'media',
      };

  String get uploadPath => switch (this) {
        ImageUploadKind.cover => '/api/upload/cover',
        ImageUploadKind.avatar => '/api/upload/avatar',
        ImageUploadKind.setupComponent => '/api/upload/media',
        ImageUploadKind.companyLogo => '/api/upload/company-logo',
        ImageUploadKind.schoolLogo => '/api/upload/school-logo',
        ImageUploadKind.orgLogo => '/api/upload/org-logo',
        ImageUploadKind.workMedia => '/api/upload/media',
      };

  String get profileField => switch (this) {
        ImageUploadKind.cover => 'coverBanner',
        ImageUploadKind.avatar => 'profileImg',
        ImageUploadKind.setupComponent => '',
        ImageUploadKind.companyLogo => '',
        ImageUploadKind.schoolLogo => '',
        ImageUploadKind.orgLogo => '',
        ImageUploadKind.workMedia => '',
      };

  String get successMessage => switch (this) {
        ImageUploadKind.cover => 'Cover image updated.',
        ImageUploadKind.avatar => 'Profile photo updated.',
        ImageUploadKind.setupComponent => 'Component image ready.',
        ImageUploadKind.companyLogo => 'Company logo ready.',
        ImageUploadKind.schoolLogo => 'School logo ready.',
        ImageUploadKind.orgLogo => 'Issuer logo ready.',
        ImageUploadKind.workMedia => 'Work media ready.',
      };

  String get defaultFilename => switch (this) {
        ImageUploadKind.cover => 'cover.jpg',
        ImageUploadKind.avatar => 'avatar.jpg',
        ImageUploadKind.setupComponent => 'component.jpg',
        ImageUploadKind.companyLogo => 'company-logo.jpg',
        ImageUploadKind.schoolLogo => 'school-logo.jpg',
        ImageUploadKind.orgLogo => 'org-logo.jpg',
        ImageUploadKind.workMedia => 'work-media.jpg',
      };
}

/// @deprecated Use [ImageUploadKind].
typedef ProfileImageUploadKind = ImageUploadKind;
