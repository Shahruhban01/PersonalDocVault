import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

/// Persisted secure session manager that handles active tokens, profile metadata,
/// and client-side encryption keys using hardware-backed keystore/keychain.
class SessionService extends GetxService {
  final _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
  final _localAuth = LocalAuthentication();

  String? _accessToken;
  List<int>? _masterKey;
  Map<String, dynamic>? _userData;

  String? get accessToken => _accessToken;
  List<int>? get masterKey => _masterKey;
  Map<String, dynamic>? get userData => _userData;
  bool get isLocked => _masterKey == null;

  /// Check if a persistent session exists on startup.
  Future<bool> initSecureSession() async {
    try {
      final token = await _secureStorage.read(key: 'accessToken');
      final masterKeyB64 = await _secureStorage.read(key: 'masterKey');
      final userJson = await _secureStorage.read(key: 'userData');

      if (token != null && masterKeyB64 != null && userJson != null) {
        return true;
      }
    } catch (e) {
      await clearSecureSession();
    }
    return false;
  }

  /// Load session credentials from secure storage into memory.
  Future<bool> loadPersistentSession() async {
    try {
      final token = await _secureStorage.read(key: 'accessToken');
      final masterKeyB64 = await _secureStorage.read(key: 'masterKey');
      final userJson = await _secureStorage.read(key: 'userData');

      if (token != null && masterKeyB64 != null && userJson != null) {
        _accessToken = token;
        _masterKey = base64.decode(masterKeyB64);
        _userData = json.decode(userJson);
        return true;
      }
    } catch (e) {
      await clearSecureSession();
    }
    return false;
  }

  /// Store active credentials upon successful vault unlock.
  Future<void> unlock({
    required String token,
    required List<int> keyBytes,
    required Map<String, dynamic> userData,
  }) async {
    _accessToken = token;
    _masterKey = keyBytes;
    _userData = userData;

    // Persist securely to device Keychain/Keystore
    await _secureStorage.write(key: 'accessToken', value: token);
    await _secureStorage.write(key: 'masterKey', value: base64.encode(keyBytes));
    await _secureStorage.write(key: 'userData', value: json.encode(userData));
  }

  /// Clean all secure storage.
  Future<void> clearSecureSession() async {
    _accessToken = null;
    _masterKey = null;
    _userData = null;
    await _secureStorage.delete(key: 'accessToken');
    await _secureStorage.delete(key: 'masterKey');
    await _secureStorage.delete(key: 'userData');
  }

  /// Securely purge the active key and route to authentication screen.
  Future<void> lock() async {
    await clearSecureSession();
    Get.offAllNamed('/login');
  }

  /// Trigger biometric authentication challenge.
  Future<bool> authenticateBiometrics() async {
    try {
      final isAvailable = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();

      if (!isAvailable && !isDeviceSupported) {
        return false;
      }

      return await _localAuth.authenticate(
        localizedReason: 'Authenticate to unlock your secure vault container',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false, // Allows device PIN/Pattern fallback
        ),
      );
    } on PlatformException catch (e) {
      Get.log('Biometric authentication error: $e');
      return false;
    }
  }
}
