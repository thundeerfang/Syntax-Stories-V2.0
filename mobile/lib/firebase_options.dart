// Firebase options for project `syntax-stories-v2`.
// Android was added manually; iOS generated via `flutterfire configure --platforms=ios`.

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions have not been configured for web.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for macos.',
        );
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAl1QE7C18wq005eCrIh6iGiO27KUmWXuY',
    appId: '1:787137570403:android:33de4d57aa23c2d2bffa56',
    messagingSenderId: '787137570403',
    projectId: 'syntax-stories-v2',
    storageBucket: 'syntax-stories-v2.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAjNwYoTkyLbcbyqBSGvH8NggEahBkp6Ms',
    appId: '1:787137570403:ios:56895095b9e53eaebffa56',
    messagingSenderId: '787137570403',
    projectId: 'syntax-stories-v2',
    storageBucket: 'syntax-stories-v2.firebasestorage.app',
    iosBundleId: 'com.syntaxstories.syntaxStoriesApp',
  );
}
