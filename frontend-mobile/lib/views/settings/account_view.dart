import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_theme.dart';
import '../../viewmodels/vault_viewmodel.dart';
import '../../services/session_service.dart';

class AccountView extends StatefulWidget {
  const AccountView({Key? key}) : super(key: key);

  @override
  State<AccountView> createState() => _AccountViewState();
}

class _AccountViewState extends State<AccountView> {
  final controller = Get.find<VaultViewModel>();
  final sessionService = Get.find<SessionService>();

  final _profileFormKey = GlobalKey<FormState>();
  final _passwordFormKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _oldPasswordController;
  late TextEditingController _newPasswordController;
  late TextEditingController _confirmPasswordController;

  String _selectedAvatar = 'avatar_1';
  bool _obscureOld = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  final Map<String, IconData> avatarIcons = {
    'avatar_1': Icons.face,
    'avatar_2': Icons.rocket_launch,
    'avatar_3': Icons.pets,
    'avatar_4': Icons.anchor,
    'avatar_5': Icons.shield,
    'avatar_6': Icons.sentiment_very_satisfied,
  };

  final Map<String, Color> avatarColors = {
    'avatar_1': Colors.blue,
    'avatar_2': Colors.redAccent,
    'avatar_3': Colors.amber,
    'avatar_4': Colors.teal,
    'avatar_5': Colors.purple,
    'avatar_6': Colors.pink,
  };

  @override
  void initState() {
    super.initState();
    final user = sessionService.userData ?? {};
    _nameController = TextEditingController(text: user['name']?.toString() ?? '');
    _selectedAvatar = user['avatar']?.toString() ?? 'avatar_1';

    _oldPasswordController = TextEditingController();
    _newPasswordController = TextEditingController();
    _confirmPasswordController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _updateProfile() async {
    if (!_profileFormKey.currentState!.validate()) return;

    final success = await controller.updateProfile(
      name: _nameController.text.trim(),
      avatar: _selectedAvatar,
    );

    if (success) {
      Get.snackbar(
        'Profile Updated',
        'Your profile changes have been saved successfully.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.green.withOpacity(0.9),
        colorText: Colors.white,
      );
    } else {
      Get.snackbar(
        'Update Failed',
        controller.error.value.isNotEmpty ? controller.error.value : 'Failed to update profile.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.redAccent.withOpacity(0.9),
        colorText: Colors.white,
      );
    }
  }

  Future<void> _changePassword() async {
    if (!_passwordFormKey.currentState!.validate()) return;

    // Show a confirm dialog highlighting the re-encryption process
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surfaceColor,
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.orange),
            SizedBox(width: 10),
            Text('Re-encrypt Vault?'),
          ],
        ),
        content: const Text(
          'Changing your password requires decrypting all notes, cards, and file metadata on your device and re-encrypting them with the new derived key.\n\nThis process is fully zero-knowledge and secure. Please do not close the app or disconnect from the internet.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
            onPressed: () => Navigator.of(context).pop(false),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor),
            child: const Text('Proceed', style: TextStyle(color: AppTheme.backgroundColor, fontWeight: FontWeight.bold)),
            onPressed: () => Navigator.of(context).pop(true),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final success = await controller.changePassword(
      _oldPasswordController.text,
      _newPasswordController.text,
    );

    if (success) {
      _oldPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
      Get.snackbar(
        'Passphrase Changed',
        'Vault metadata re-encrypted and synced successfully.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.green.withOpacity(0.9),
        colorText: Colors.white,
      );
    } else {
      Get.snackbar(
        'Re-encryption Failed',
        controller.error.value.isNotEmpty ? controller.error.value : 'Failed to re-encrypt and change password.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.redAccent.withOpacity(0.9),
        colorText: Colors.white,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Account Settings'),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Profile Section Card
                Card(
                  color: AppTheme.surfaceColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: Colors.white10),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Form(
                      key: _profileFormKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Profile Information',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 16),
                          
                          // Display name field
                          TextFormField(
                            controller: _nameController,
                            style: const TextStyle(color: Colors.white),
                            decoration: const InputDecoration(
                              labelText: 'Display Name',
                              prefixIcon: Icon(Icons.person_outline),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Name cannot be empty';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // Avatar label
                          const Text(
                            'Select Avatar',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey),
                          ),
                          const SizedBox(height: 12),

                          // Avatar grid selector
                          GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: avatarIcons.length,
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 6,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                            ),
                            itemBuilder: (context, index) {
                              final key = 'avatar_${index + 1}';
                              final isSelected = _selectedAvatar == key;
                              return GestureDetector(
                                onTap: () => setState(() => _selectedAvatar = key),
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: isSelected ? avatarColors[key]!.withOpacity(0.2) : Colors.white.withOpacity(0.05),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isSelected ? AppTheme.primaryColor : Colors.white10,
                                      width: isSelected ? 2.5 : 1,
                                    ),
                                    boxShadow: isSelected
                                        ? [BoxShadow(color: AppTheme.primaryColor.withOpacity(0.3), blurRadius: 8)]
                                        : null,
                                  ),
                                  child: Icon(
                                    avatarIcons[key],
                                    color: isSelected ? AppTheme.primaryColor : Colors.grey,
                                    size: 24,
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 24),

                          // Save profile button
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                foregroundColor: AppTheme.backgroundColor,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              icon: const Icon(Icons.save_outlined),
                              label: const Text('Save Profile Details', style: TextStyle(fontWeight: FontWeight.bold)),
                              onPressed: _updateProfile,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // 2. Change Password Section Card
                Card(
                  color: AppTheme.surfaceColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: Colors.white10),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Form(
                      key: _passwordFormKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Change Master Passphrase',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 8),

                          // Warning Banner
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.orange.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.orange.withOpacity(0.3)),
                            ),
                            child: const Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 20),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Zero-Knowledge Warning: Re-encrypting your vault requires high-intensity local computation. Ensure you remember your new passphrase. If lost, your vault cannot be recovered.',
                                    style: TextStyle(color: Colors.orangeAccent, fontSize: 11, height: 1.4),
                                  ),
                                )
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Old Passphrase Field
                          TextFormField(
                            controller: _oldPasswordController,
                            obscureText: _obscureOld,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              labelText: 'Current Passphrase',
                              prefixIcon: const Icon(Icons.lock_outline),
                              suffixIcon: IconButton(
                                icon: Icon(_obscureOld ? Icons.visibility_off : Icons.visibility, color: Colors.grey),
                                onPressed: () => setState(() => _obscureOld = !_obscureOld),
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.isEmpty) {
                                return 'Enter current passphrase';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // New Passphrase Field
                          TextFormField(
                            controller: _newPasswordController,
                            obscureText: _obscureNew,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              labelText: 'New Passphrase',
                              prefixIcon: const Icon(Icons.lock_reset_outlined),
                              suffixIcon: IconButton(
                                icon: Icon(_obscureNew ? Icons.visibility_off : Icons.visibility, color: Colors.grey),
                                onPressed: () => setState(() => _obscureNew = !_obscureNew),
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.length < 8) {
                                return 'Passphrase must be at least 8 characters long';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Confirm Passphrase Field
                          TextFormField(
                            controller: _confirmPasswordController,
                            obscureText: _obscureConfirm,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              labelText: 'Confirm New Passphrase',
                              prefixIcon: const Icon(Icons.lock_reset_outlined),
                              suffixIcon: IconButton(
                                icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility, color: Colors.grey),
                                onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                              ),
                            ),
                            validator: (val) {
                              if (val != _newPasswordController.text) {
                                return 'Passphrases do not match';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 24),

                          // Submit change password button
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.redAccent.withOpacity(0.1),
                                foregroundColor: Colors.redAccent,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  side: const BorderSide(color: Colors.redAccent, width: 1),
                                ),
                              ),
                              icon: const Icon(Icons.lock_open_outlined),
                              label: const Text('Re-encrypt & Update Passphrase', style: TextStyle(fontWeight: FontWeight.bold)),
                              onPressed: _changePassword,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Loading spinner / overlay for the re-encryption process
          Obx(() {
            if (!controller.isLoading.value) return const SizedBox.shrink();
            return Container(
              color: Colors.black87,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                    ),
                    SizedBox(height: 20),
                    Text(
                      'Re-encrypting Vault...',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 40),
                      child: Text(
                        'Decrypting, re-keying, and synchronizing your notes, credentials, and metadata. Please do not close the app.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white54, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
