import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api_errors.dart';
import 'auth_api.dart';

/// Opens the server OAuth start URL in an in-app browser when available.
Future<void> launchOAuthUrl(String url) async {
  final uri = Uri.parse(url);
  try {
    // canLaunchUrl often returns false on Android 11+ even when launchUrl works.
    final launched = await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
    final fallbackLaunched =
        launched || await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!fallbackLaunched) {
      throw AuthApiException(
        'Could not open the sign-in browser. Install or enable a browser app and try again.',
        debugDetails: 'launchUrl returned false for: $url',
      );
    }
  } on AuthApiException {
    rethrow;
  } on PlatformException catch (e) {
    throw AuthApiException(
      'Could not open the sign-in browser. Install or enable a browser app and try again.',
      debugDetails: 'OAuth launch failed (${e.code}): ${e.message} — $url',
    );
  } catch (e) {
    throw AuthApiException(
      kGenericUserError,
      debugDetails: 'OAuth launch failed: $e — $url',
    );
  }
}
