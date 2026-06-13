import 'package:flutter/services.dart';

import 'user_message_case.dart';

/// Shared input limits — mirrors server `profileZodSchemas` + webapp `profileLinkLimits`.
abstract final class FieldLimits {
  static const fullNameMinSignup = 2;
  static const fullNameMinProfile = 1;
  static const fullNameMax = 100;

  static const usernameMin = 2;
  static const usernameMax = 30;

  static const bioMax = 100;

  static const emailMax = 254;

  static const otpLength = 6;

  static const referralMin = 8;
  static const referralMax = 16;

  static const portfolioUrlMin = 4;
  static const portfolioUrlMax = 500;

  static const socialUrlMin = 4;
  static const socialUrlMax = 500;

  static const instagramMax = 200;
}

final _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final _usernameRegex = RegExp(r'^\w+$');
final _referralCodeRegex = RegExp(r'^[0-9A-HJKMNP-TV-Z]{8,16}$');

/// Validation + formatters for a single input kind.
class AppFieldRule {
  const AppFieldRule({
    required this.maxLength,
    this.minLength = 0,
    this.exactLength,
    this.required = false,
    this.optional = false,
    this.digitsOnly = false,
    this.lowercase = false,
    this.uppercase = false,
    this.urlWhenNonEmpty = false,
    this.allowedInputPattern,
    this.allowedValuePattern,
    this.requiredMessage,
    this.invalidFormatMessage,
    this.tooShortMessage,
    this.tooLongMessage,
    this.counterMode = FieldCounterMode.rangeOrLength,
  });

  final int maxLength;
  final int minLength;
  final int? exactLength;
  final bool required;
  final bool optional;
  final bool digitsOnly;
  final bool lowercase;
  final bool uppercase;
  final bool urlWhenNonEmpty;
  final RegExp? allowedInputPattern;
  final RegExp? allowedValuePattern;
  final String? requiredMessage;
  final String? invalidFormatMessage;
  final String? tooShortMessage;
  final String? tooLongMessage;
  final FieldCounterMode counterMode;

  List<TextInputFormatter> get inputFormatters {
    final formatters = <TextInputFormatter>[
      LengthLimitingTextInputFormatter(maxLength),
    ];
    if (digitsOnly) {
      formatters.insert(0, FilteringTextInputFormatter.digitsOnly);
    }
    if (allowedInputPattern != null) {
      formatters.insert(0, FilteringTextInputFormatter.allow(allowedInputPattern!));
    }
    if (uppercase) {
      formatters.add(_UpperCaseTextFormatter());
    }
    if (lowercase) {
      formatters.add(_LowerCaseTextFormatter());
    }
    return formatters;
  }

  String counterLabel(String raw) {
    final len = raw.length;
    switch (counterMode) {
      case FieldCounterMode.exact:
        return '$len/${exactLength ?? maxLength}';
      case FieldCounterMode.lengthOnly:
        return '$len/$maxLength';
      case FieldCounterMode.rangeOrLength:
        if (len == 0 && minLength > 0) return '$minLength–$maxLength';
        return '$len/$maxLength';
    }
  }

  String? validate(String? value) {
    final trimmed = value?.trim() ?? '';
    final len = trimmed.length;

    if (len == 0) {
      if (required) return formatUserMessage(requiredMessage ?? 'This Field Is Required');
      if (optional) return null;
      return null;
    }

    if (exactLength != null && len != exactLength) {
      return formatUserMessage(invalidFormatMessage ?? 'Must Be Exactly $exactLength Characters');
    }
    if (len < minLength) {
      return formatUserMessage(tooShortMessage ?? 'Must Be At Least $minLength Characters');
    }
    if (len > maxLength) {
      return formatUserMessage(tooLongMessage ?? 'Must Be At Most $maxLength Characters');
    }

    if (allowedValuePattern != null && !allowedValuePattern!.hasMatch(trimmed)) {
      return formatUserMessage(invalidFormatMessage ?? 'Invalid Format');
    }

    if (urlWhenNonEmpty && !isValidHttpUrl(trimmed)) {
      return formatUserMessage(invalidFormatMessage ?? 'Enter A Valid URL (Https://…)');
    }

    return null;
  }

  static bool isValidHttpUrl(String raw) {
    final uri = Uri.tryParse(raw);
    if (uri == null || !uri.hasScheme) return false;
    if (uri.scheme != 'http' && uri.scheme != 'https') return false;
    return uri.host.isNotEmpty;
  }

  // --- Presets (server-aligned) ---

  static final fullNameSignup = AppFieldRule(
    minLength: FieldLimits.fullNameMinSignup,
    maxLength: FieldLimits.fullNameMax,
    required: true,
    requiredMessage: 'Full name is required',
    tooShortMessage: 'Name must be at least ${FieldLimits.fullNameMinSignup} characters',
    tooLongMessage: 'Name must be at most ${FieldLimits.fullNameMax} characters',
  );

  static final fullNameProfile = AppFieldRule(
    minLength: FieldLimits.fullNameMinProfile,
    maxLength: FieldLimits.fullNameMax,
    required: true,
    requiredMessage: 'Full name is required',
    tooShortMessage: 'Name must be at least ${FieldLimits.fullNameMinProfile} character',
    tooLongMessage: 'Name must be at most ${FieldLimits.fullNameMax} characters',
  );

  static final username = AppFieldRule(
    minLength: FieldLimits.usernameMin,
    maxLength: FieldLimits.usernameMax,
    required: true,
    lowercase: true,
    allowedInputPattern: RegExp(r'[a-zA-Z0-9_]'),
    allowedValuePattern: _usernameRegex,
    requiredMessage: 'Username is required',
    tooShortMessage: 'Username must be at least ${FieldLimits.usernameMin} characters',
    tooLongMessage: 'Username must be at most ${FieldLimits.usernameMax} characters',
    invalidFormatMessage: 'Letters, numbers, and underscores only',
  );

  static final bio = AppFieldRule(
    maxLength: FieldLimits.bioMax,
    optional: true,
    counterMode: FieldCounterMode.lengthOnly,
  );

  static final email = AppFieldRule(
    minLength: 1,
    maxLength: FieldLimits.emailMax,
    required: true,
    requiredMessage: 'Email is required',
    invalidFormatMessage: 'Enter a valid email address',
    allowedValuePattern: _emailRegex,
    allowedInputPattern: RegExp(r'[^\s]'),
  );

  static final otp = AppFieldRule(
    maxLength: FieldLimits.otpLength,
    exactLength: FieldLimits.otpLength,
    required: true,
    digitsOnly: true,
    requiredMessage: 'Code is required',
    invalidFormatMessage: 'Enter the 6-digit code from your email',
    counterMode: FieldCounterMode.exact,
  );

  static final totp = AppFieldRule(
    maxLength: FieldLimits.otpLength,
    exactLength: FieldLimits.otpLength,
    required: true,
    digitsOnly: true,
    requiredMessage: 'Authenticator code is required',
    invalidFormatMessage: 'Enter the 6-digit code from your app',
    counterMode: FieldCounterMode.exact,
  );

  static final referralCode = AppFieldRule(
    minLength: FieldLimits.referralMin,
    maxLength: FieldLimits.referralMax,
    optional: true,
    uppercase: true,
    allowedInputPattern: RegExp(r'[0-9A-Za-z]'),
    allowedValuePattern: _referralCodeRegex,
    tooShortMessage: 'Referral code must be at least ${FieldLimits.referralMin} characters',
    tooLongMessage: 'Referral code must be at most ${FieldLimits.referralMax} characters',
    invalidFormatMessage: 'Use letters and numbers only (no I, L, O, or U)',
  );

  static final portfolioUrl = AppFieldRule(
    minLength: FieldLimits.portfolioUrlMin,
    maxLength: FieldLimits.portfolioUrlMax,
    optional: true,
    urlWhenNonEmpty: true,
    tooShortMessage: 'URL must be at least ${FieldLimits.portfolioUrlMin} characters when provided',
    invalidFormatMessage: 'Enter a valid URL (https://…)',
  );

  static final linkedinUrl = AppFieldRule(
    minLength: FieldLimits.socialUrlMin,
    maxLength: FieldLimits.socialUrlMax,
    optional: true,
    urlWhenNonEmpty: true,
    invalidFormatMessage: 'Enter a valid LinkedIn URL',
  );

  static final githubUrl = AppFieldRule(
    minLength: FieldLimits.socialUrlMin,
    maxLength: FieldLimits.socialUrlMax,
    optional: true,
    urlWhenNonEmpty: true,
    invalidFormatMessage: 'Enter a valid GitHub URL',
  );

  static final youtubeUrl = AppFieldRule(
    minLength: FieldLimits.socialUrlMin,
    maxLength: FieldLimits.socialUrlMax,
    optional: true,
    urlWhenNonEmpty: true,
    invalidFormatMessage: 'Enter a valid YouTube URL',
  );

  static final instagram = AppFieldRule(
    maxLength: FieldLimits.instagramMax,
    optional: true,
    counterMode: FieldCounterMode.lengthOnly,
    tooLongMessage: 'Instagram must be at most ${FieldLimits.instagramMax} characters',
  );
}

enum FieldCounterMode { rangeOrLength, lengthOnly, exact }

class _UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    return newValue.copyWith(text: newValue.text.toUpperCase());
  }
}

class _LowerCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    return newValue.copyWith(text: newValue.text.toLowerCase());
  }
}

String? validateEmail(String? value) => AppFieldRule.email.validate(value);
String? validateFullName(String? value) => AppFieldRule.fullNameSignup.validate(value);
String? validateOtpCode(String? value) => AppFieldRule.otp.validate(value);
String? validateTotpCode(String? value) => AppFieldRule.totp.validate(value);

String normalizeOtpInput(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  return digits.length <= FieldLimits.otpLength
      ? digits
      : digits.substring(0, FieldLimits.otpLength);
}

String? validateReferralCode(String? value) {
  final trimmed = value?.trim() ?? '';
  if (trimmed.isEmpty) return null;
  return AppFieldRule.referralCode.validate(trimmed);
}
