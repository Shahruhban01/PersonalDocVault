import 'dart:convert';
import 'package:cryptography/cryptography.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:get/get.dart';
import '../services/api_service.dart';
import '../services/crypto_service.dart';
import '../services/session_service.dart';

/// Auth ViewModel managing inputs validations, loading flags, and tokens storage.
class AuthViewModel extends GetxController {
  final ApiService _apiService = Get.find<ApiService>();
  final CryptoService _cryptoService = Get.find<CryptoService>();
  final SessionService _sessionService = Get.find<SessionService>();

  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  final RxBool isLoading = false.obs;
  final RxString errorMessage = ''.obs;

  @override
  void onClose() {
    emailController.dispose();
    passwordController.dispose();
    super.onClose();
  }

  /**
   * Log in user and save session access tokens.
   */
  Future<void> login() async {
    final email = emailController.text.trim();
    final password = passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      errorMessage.value = 'Email and Passphrase are required.';
      return;
    }

    try {
      isLoading.value = true;
      errorMessage.value = '';

      final passwordHash = await _hashPassphrase(password);
      final response = await _apiService.dio.post('/auth/login', data: {
        'email': email,
        'password': passwordHash
      });

      if (response.statusCode == 200) {
        final data = response.data['data'];
        final String accessToken = data['accessToken'];
        final user = Map<String, dynamic>.from(data['user'] ?? {});
        final encryptionSalt = data['encryptionSalt']?.toString();

        if (encryptionSalt == null || encryptionSalt.isEmpty) {
          throw StateError('Authentication salt parameter missing from account response.');
        }

        final keyBytes = await _cryptoService.deriveKey(password, encryptionSalt);

        // Update HTTP Authorization header context and store in-memory session
        _apiService.setToken(accessToken);
        _sessionService.unlock(
          token: accessToken,
          keyBytes: keyBytes,
          userData: user,
        );
        
        // Route dashboard transition
        Get.offAllNamed('/home');
      }
    } catch (e, stack) {
      if (kDebugMode) {
        debugPrint('Login exception: $e');
        debugPrint('Stacktrace: $stack');
        if (e is DioException) {
          debugPrint('DioException Details: ${e.message} | Response: ${e.response?.statusCode} ${e.response?.data}');
        }
      }
      errorMessage.value = 'Failed to unlock vault. Invalid credentials.';
    } finally {
      isLoading.value = false;
    }
  }

  Future<String> _hashPassphrase(String passphrase) async {
    final hash = await Sha256().hash(utf8.encode(passphrase));
    return hash.bytes
        .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
        .join();
  }
}
