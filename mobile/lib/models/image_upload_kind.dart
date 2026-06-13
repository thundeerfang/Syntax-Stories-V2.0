/// Shared upload/crop presets — cover, avatar, setup, logos, and profile media.
enum ImageUploadKind {
  cover,
  avatar,
  setupComponent,
  orgLogo,
  squadIcon,
  squadBanner,
}

extension ImageUploadKindConfig on ImageUploadKind {
  double get aspectRatio => switch (this) {
        ImageUploadKind.cover => 4,
        ImageUploadKind.avatar => 1,
        ImageUploadKind.setupComponent => 16 / 9,
        ImageUploadKind.orgLogo => 1,
        ImageUploadKind.squadIcon => 1,
        ImageUploadKind.squadBanner => 4,
      };

  double get cropViewportHeight => switch (this) {
        ImageUploadKind.cover => 200,
        ImageUploadKind.avatar => 260,
        ImageUploadKind.setupComponent => 200,
        ImageUploadKind.orgLogo => 220,
        ImageUploadKind.squadIcon => 220,
        ImageUploadKind.squadBanner => 200,
      };

  int get maxSizeBytes => switch (this) {
        ImageUploadKind.cover => 10 * 1024 * 1024,
        ImageUploadKind.avatar => 5 * 1024 * 1024,
        ImageUploadKind.setupComponent => 5 * 1024 * 1024,
        ImageUploadKind.orgLogo => 5 * 1024 * 1024,
        ImageUploadKind.squadIcon => 2 * 1024 * 1024,
        ImageUploadKind.squadBanner => 10 * 1024 * 1024,
      };

  String get maxSizeLabel => switch (this) {
        ImageUploadKind.cover => '10 MB',
        ImageUploadKind.avatar => '5 MB',
        ImageUploadKind.setupComponent => '5 MB',
        ImageUploadKind.orgLogo => '5 MB',
        ImageUploadKind.squadIcon => '2 MB',
        ImageUploadKind.squadBanner => '10 MB',
      };

  String get aspectLabel => switch (this) {
        ImageUploadKind.cover => '4∶1',
        ImageUploadKind.avatar => '1∶1',
        ImageUploadKind.setupComponent => '16∶9',
        ImageUploadKind.orgLogo => '1∶1',
        ImageUploadKind.squadIcon => '1∶1',
        ImageUploadKind.squadBanner => '4∶1',
      };

  String get dialogTitle => switch (this) {
        ImageUploadKind.cover => 'UPLOAD COVER',
        ImageUploadKind.avatar => 'UPLOAD PROFILE PHOTO',
        ImageUploadKind.setupComponent => 'UPLOAD COMPONENT IMAGE',
        ImageUploadKind.orgLogo => 'UPLOAD ISSUER LOGO',
        ImageUploadKind.squadIcon => 'SQUAD ICON',
        ImageUploadKind.squadBanner => 'SQUAD BANNER',
      };

  String get pickPrompt => switch (this) {
        ImageUploadKind.cover => 'CHOOSE A COVER PICTURE',
        ImageUploadKind.avatar => 'CHOOSE A PROFILE PICTURE',
        ImageUploadKind.setupComponent => 'CHOOSE A COMPONENT IMAGE',
        ImageUploadKind.orgLogo => 'CHOOSE AN ISSUER LOGO',
        ImageUploadKind.squadIcon => 'CHOOSE SQUAD ICON',
        ImageUploadKind.squadBanner => 'CHOOSE SQUAD BANNER',
      };

  String get pickHint => switch (this) {
        ImageUploadKind.cover => 'Cover image will be updated',
        ImageUploadKind.avatar => 'Profile photo will be updated',
        ImageUploadKind.setupComponent => 'Component image will be attached',
        ImageUploadKind.orgLogo => 'Logo will be attached to this certification',
        ImageUploadKind.squadIcon => 'Icon will be attached to this squad',
        ImageUploadKind.squadBanner => 'Banner will be attached to this squad',
      };

  String get subtitle => switch (this) {
        ImageUploadKind.orgLogo =>
          'JPEG, PNG, WebP, or iPhone photo (HEIC) · $aspectLabel crop · Max $maxSizeLabel',
        _ =>
          'JPEG, PNG, GIF, WebP, or iPhone photo (HEIC) · $aspectLabel crop · Max $maxSizeLabel',
      };

  /// Client-side pick validation — certification issuer logos.
  bool get validatesLogoPickFormat => this == ImageUploadKind.orgLogo;

  /// Post-crop size cap on device — profile logos and squad icon.
  bool get enforcesMaxSizeAfterCrop =>
      this == ImageUploadKind.orgLogo || this == ImageUploadKind.squadIcon;

  String get confirmLabel => 'SAVE & UPLOAD';

  bool get patchesProfile =>
      this == ImageUploadKind.cover || this == ImageUploadKind.avatar;

  String get formField => switch (this) {
        ImageUploadKind.cover => 'cover',
        ImageUploadKind.avatar => 'avatar',
        ImageUploadKind.setupComponent => 'media',
        ImageUploadKind.orgLogo => 'logo',
        ImageUploadKind.squadIcon => 'media',
        ImageUploadKind.squadBanner => 'cover',
      };

  String get uploadPath => switch (this) {
        ImageUploadKind.cover => '/api/upload/cover',
        ImageUploadKind.avatar => '/api/upload/avatar',
        ImageUploadKind.setupComponent => '/api/upload/media',
        ImageUploadKind.orgLogo => '/api/upload/org-logo',
        ImageUploadKind.squadIcon => '/api/upload/media',
        ImageUploadKind.squadBanner => '/api/upload/cover',
      };

  String get profileField => switch (this) {
        ImageUploadKind.cover => 'coverBanner',
        ImageUploadKind.avatar => 'profileImg',
        ImageUploadKind.setupComponent => '',
        ImageUploadKind.orgLogo => '',
        ImageUploadKind.squadIcon => '',
        ImageUploadKind.squadBanner => '',
      };

  String get successMessage => switch (this) {
        ImageUploadKind.cover => 'Cover image updated.',
        ImageUploadKind.avatar => 'Profile photo updated.',
        ImageUploadKind.setupComponent => 'Component image ready.',
        ImageUploadKind.orgLogo => 'Issuer logo ready.',
        ImageUploadKind.squadIcon => 'Squad icon ready.',
        ImageUploadKind.squadBanner => 'Squad banner ready.',
      };

  String get defaultFilename => switch (this) {
        ImageUploadKind.cover => 'cover.jpg',
        ImageUploadKind.avatar => 'avatar.jpg',
        ImageUploadKind.setupComponent => 'component.jpg',
        ImageUploadKind.orgLogo => 'org-logo.jpg',
        ImageUploadKind.squadIcon => 'squad-icon.jpg',
        ImageUploadKind.squadBanner => 'squad-banner.jpg',
      };
}

/// @deprecated Use [ImageUploadKind].
typedef ProfileImageUploadKind = ImageUploadKind;
