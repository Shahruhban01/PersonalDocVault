import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../services/api_service.dart';

/// Auth ViewModel managing inputs validations, loading flags, and tokens storage.
class AuthViewModel extends GetxController {
  final ApiService _apiService = Get.find<ApiService>();

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

      final response = await _apiService.dio.post('/auth/login', data: {
        'email': email,
        'password': password
      });

      if (response.statusCode == 200) {
        final data = response.data['data'];
        final String accessToken = data['accessToken'];
        
        // Update HTTP Authorization header context
        _apiService.setToken(accessToken);
        
        // Route dashboard transition
        Get.offAllNamed('/home');
      }
    } catch (e) {
      errorMessage.value = 'Failed to unlock vault. Invalid credentials.';
    } finally {
      isLoading.value = false;
    }
  }
}
