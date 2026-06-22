import 'package:get/get.dart';

/// In-memory session manager that handles active tokens, profile metadata,
/// and client-side encryption keys without writing them to disk.
class SessionService extends GetxService {
  String? _accessToken;
  List<int>? _masterKey;
  Map<String, dynamic>? _userData;

  String? get accessToken => _accessToken;
  List<int>? get masterKey => _masterKey;
  Map<String, dynamic>? get userData => _userData;
  bool get isLocked => _masterKey == null;

  /// Store active credentials upon successful vault unlock.
  void unlock({
    required String token,
    required List<int> keyBytes,
    required Map<String, dynamic> userData,
  }) {
    _accessToken = token;
    _masterKey = keyBytes;
    _userData = userData;
  }

  /// Securely purge the active key and route to authentication screen.
  void lock() {
    _accessToken = null;
    _masterKey = null;
    _userData = null;
    Get.offAllNamed('/login');
  }
}
