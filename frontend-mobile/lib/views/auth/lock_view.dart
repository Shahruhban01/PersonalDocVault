import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_theme.dart';
import '../../services/session_service.dart';
import '../../services/api_service.dart';
import '../../viewmodels/vault_viewmodel.dart';

/// Premium dark lock screen displayed on app startup if a secure session persists on the device.
class LockView extends StatefulWidget {
  const LockView({Key? key}) : super(key: key);

  @override
  State<LockView> createState() => _LockViewState();
}

class _LockViewState extends State<LockView> with SingleTickerProviderStateMixin {
  final _sessionService = Get.find<SessionService>();
  late AnimationController _animController;
  late Animation<double> _glowAnimation;
  bool _isAuthenticating = false;
  String _statusMessage = 'Vault is Secured';

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _glowAnimation = Tween<double>(begin: 4.0, end: 16.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );

    // Auto-trigger biometric challenge on launch
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _authenticate();
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _authenticate() async {
    if (_isAuthenticating) return;
    setState(() {
      _isAuthenticating = true;
      _statusMessage = 'Unlocking Vault...';
    });

    final success = await _sessionService.authenticateBiometrics();

    if (success) {
      final loaded = await _sessionService.loadPersistentSession();
      if (loaded) {
        // Configure access token header on API service
        Get.find<ApiService>().setToken(_sessionService.accessToken);
        
        // Reload vault data since keys are now in memory
        try {
          if (Get.isRegistered<VaultViewModel>()) {
            Get.find<VaultViewModel>().loadVault();
          }
        } catch (_) {}

        Get.offAllNamed('/home');
        return;
      }
    }

    setState(() {
      _isAuthenticating = false;
      _statusMessage = 'Authentication Failed';
    });
  }

  void _useAlternativeLogin() {
    // Purge the session and force regular login screen
    _sessionService.clearSecureSession();
    Get.offAllNamed('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0B0E14), Color(0xFF151922)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(flex: 3),
              
              // Animated glowing lock icon
              Center(
                child: AnimatedBuilder(
                  animation: _glowAnimation,
                  builder: (context, child) {
                    return Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppTheme.surfaceColor,
                        border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryColor.withOpacity(0.2),
                            blurRadius: _glowAnimation.value,
                            spreadRadius: _glowAnimation.value / 3,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.shield_outlined,
                        size: 80,
                        color: AppTheme.primaryColor,
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 32),
              
              Text(
                _statusMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Personal Vault Secure Container',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
              ),
              
              const Spacer(flex: 2),
              
              // Action buttons
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 48),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ElevatedButton.icon(
                      icon: const Icon(Icons.fingerprint_outlined),
                      label: const Text('Unlock with Biometrics / PIN'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(30),
                        ),
                      ),
                      onPressed: _authenticate,
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: _useAlternativeLogin,
                      child: const Text(
                        'Use regular login / Sign Out',
                        style: TextStyle(
                          color: Colors.grey,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
