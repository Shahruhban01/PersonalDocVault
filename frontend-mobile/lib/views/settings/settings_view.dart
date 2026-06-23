import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_theme.dart';
import '../../services/session_service.dart';
import '../../services/cache_service.dart';

/// Screen presenting profile details, cache utility controllers, and logout controls.
class SettingsView extends StatefulWidget {
  const SettingsView({Key? key}) : super(key: key);

  @override
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> {
  final sessionService = Get.find<SessionService>();
  final cacheService = Get.find<CacheService>();

  String cacheSize = 'Calculating...';

  @override
  void initState() {
    super.initState();
    _calculateCacheSize();
  }

  Future<void> _calculateCacheSize() async {
    // Basic representation of local state cache size
    final userId = sessionService.userData?['id']?.toString() ?? 'anonymous';
    final items = cacheService.read('${userId}_items');
    final folders = cacheService.read('${userId}_folders');

    int sizeBytes = 0;
    if (items != null) {
      sizeBytes += items.toString().length;
    }
    if (folders != null) {
      sizeBytes += folders.toString().length;
    }

    setState(() {
      if (sizeBytes == 0) {
        cacheSize = '0 KB';
      } else {
        cacheSize = '${(sizeBytes / 1024).toStringAsFixed(2)} KB';
      }
    });
  }

  void _clearCache() async {
    await cacheService.clear();
    setState(() {
      cacheSize = '0 KB';
    });
    Get.snackbar(
      'Cache Cleared',
      'Local offline copies deleted.',
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  void _confirmSignOut() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Lock Vault'),
        content: const Text('Are you sure you want to lock your vault and sign out? Your master key will be wiped from in-memory storage.'),
        actions: [
          TextButton(
            child: const Text('Cancel'),
            onPressed: () => Navigator.of(context).pop(false),
          ),
          TextButton(
            child: const Text('Sign Out', style: TextStyle(color: Colors.red)),
            onPressed: () => Navigator.of(context).pop(true),
          ),
        ],
      ),
    );

    if (confirm == true) {
      sessionService.lock();
      Get.snackbar(
        'Vault Locked',
        'Session security keys purged from sandbox memory.',
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = sessionService.userData ?? {};
    final email = user['email']?.toString() ?? 'unknown@example.com';
    final name = user['name']?.toString() ?? '';
    final role = user['role']?.toString() ?? 'user';
    final avatarKey = user['avatar']?.toString() ?? 'avatar_1';

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

    final avatarIcon = avatarIcons[avatarKey] ?? Icons.person;
    final avatarColor = avatarColors[avatarKey] ?? AppTheme.primaryColor;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // User profile card (Interactive)
            Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () async {
                  await Get.toNamed('/account');
                  setState(() {}); // Rebuild settings page to show updated name/avatar
                },
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Column(
                    children: [
                      Stack(
                        alignment: Alignment.bottomRight,
                        children: [
                          CircleAvatar(
                            radius: 36,
                            backgroundColor: avatarColor.withOpacity(0.2),
                            child: Icon(avatarIcon, size: 40, color: avatarColor),
                          ),
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: AppTheme.primaryColor,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.edit,
                              size: 14,
                              color: AppTheme.backgroundColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (name.isNotEmpty) ...[
                        Text(
                          name,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          email,
                          style: const TextStyle(fontSize: 14, color: Colors.grey),
                          textAlign: TextAlign.center,
                        ),
                      ] else ...[
                        Text(
                          email,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
                          textAlign: TextAlign.center,
                        ),
                      ],
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white12,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          role.toUpperCase(),
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                      )
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Settings options title
            const Text(
              'Security & Storage',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 8),

            // Cache management card
            Card(
              color: AppTheme.surfaceColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Colors.white10),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.storage_outlined, color: Colors.blue),
                    title: const Text('Cached Offline Metadata'),
                    trailing: Text(cacheSize, style: const TextStyle(color: Colors.grey)),
                  ),
                  const Divider(color: Colors.white10, height: 1),
                  ListTile(
                    leading: const Icon(Icons.delete_sweep_outlined, color: Colors.orange),
                    title: const Text('Clear Offline Cache'),
                    subtitle: const Text('Remove locally cached folder metadata', style: TextStyle(fontSize: 11)),
                    onTap: _clearCache,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Lock / Sign out button
            ElevatedButton.icon(
              icon: const Icon(Icons.lock_outline),
              label: const Text('Lock Vault & Logout', style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent.withOpacity(0.1),
                foregroundColor: Colors.redAccent,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Colors.redAccent, width: 1),
                ),
              ),
              onPressed: _confirmSignOut,
            ),
          ],
        ),
      ),
    );
  }
}
