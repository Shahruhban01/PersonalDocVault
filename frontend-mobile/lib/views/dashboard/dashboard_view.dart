import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_theme.dart';
import '../../viewmodels/vault_viewmodel.dart';
import '../widgets/upload_progress_overlay.dart';

/// Live dashboard screen displaying statistics, shortcuts, and decrypted favorited items.
class DashboardView extends StatelessWidget {
  const DashboardView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Register or find VaultViewModel
    final controller = Get.put(VaultViewModel());

    return Scaffold(
      appBar: AppBar(
        title: const Text('Personal Vault'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () => controller.loadVault(),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => Get.toNamed('/settings'),
          ),
        ],
      ),
      body: Stack(
        children: [
          RefreshIndicator(
            onRefresh: () => controller.loadVault(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Google Drive-style Search Bar
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceColor,
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: TextField(
                      style: const TextStyle(color: Colors.white),
                      onChanged: (val) => controller.searchQuery.value = val,
                      decoration: InputDecoration(
                        hintText: 'Search in Vault...',
                        hintStyle: const TextStyle(color: Colors.grey),
                        prefixIcon: const Icon(Icons.search, color: Colors.grey),
                        suffixIcon: Obx(() {
                          if (controller.searchQuery.value.isEmpty) {
                            return const SizedBox.shrink();
                          }
                          return IconButton(
                            icon: const Icon(Icons.clear, color: Colors.grey),
                            onPressed: () {
                              controller.searchQuery.value = '';
                              FocusScope.of(context).unfocus();
                            },
                          );
                        }),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),

                  Obx(() {
                    // Check if searching
                    if (controller.searchQuery.value.isNotEmpty) {
                      final results = controller.filteredItems;
                      if (results.isEmpty) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 40.0),
                            child: Text('No matching items found.', style: TextStyle(color: Colors.grey)),
                          ),
                        );
                      }
                      return ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: results.length,
                        separatorBuilder: (c, i) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final item = results[index];
                          final type = item['type']?.toString() ?? 'document';
                          IconData icon = Icons.description_outlined;
                          Color iconColor = Colors.green;
                          
                          if (type == 'note') {
                            icon = Icons.notes_outlined;
                            iconColor = Colors.orange;
                          } else if (type == 'card') {
                            icon = Icons.credit_card_outlined;
                            iconColor = Colors.purple;
                          }

                          return Card(
                            color: AppTheme.surfaceColor,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: const BorderSide(color: Colors.white10),
                            ),
                            child: ListTile(
                              leading: Icon(icon, color: iconColor),
                              title: FutureBuilder<String>(
                                future: controller.decryptField(item['encryptedTitle']),
                                builder: (context, snapshot) {
                                  return Text(
                                    snapshot.data ?? 'Decrypting...',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  );
                                },
                              ),
                              subtitle: Text(
                                '${type.toUpperCase()} • ${item['createdAt'] != null ? item['createdAt'].toString().split('T').first : ''}',
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                              onTap: () {
                                if (type == 'note') {
                                  Get.toNamed('/note-detail', arguments: item);
                                } else if (type == 'card') {
                                  Get.toNamed('/cards');
                                } else if (type == 'document') {
                                  Get.toNamed('/documents');
                                }
                              },
                            ),
                          );
                        },
                      );
                    }

                    // Otherwise show Dashboard Content
                    final notesCount = controller.items.where((x) => x['type'] == 'note').length;
                    final cardsCount = controller.items.where((x) => x['type'] == 'card').length;
                    final filesCount = controller.items.where((x) => x['type'] == 'document').length;
                    final favorites = controller.items.where((item) => item['isFavorite'] == true).toList();

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Shield Status Card (Glassmorphic)
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceColor,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white10),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.verified_user, color: AppTheme.primaryColor, size: 40),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Zero-Knowledge Lock Active',
                                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                        fontWeight: FontWeight.bold
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      'Your key is derived in sandbox memory. Wiped on close.',
                                      style: TextStyle(color: Colors.grey, fontSize: 12),
                                    ),
                                  ],
                                ),
                              )
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        
                        // Categories Section
                        const Text(
                          'Vault Folders',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),
                        
                        GridView.count(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisCount: 3,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                          childAspectRatio: 1.1,
                          children: [
                            _buildCategoryCard('Notes', Icons.notes_outlined, Colors.orange, '$notesCount items', () => Get.toNamed('/notes')),
                            _buildCategoryCard('Cards', Icons.credit_card_outlined, Colors.purple, '$cardsCount cards', () => Get.toNamed('/cards')),
                            _buildCategoryCard('Files', Icons.folder_open_outlined, Colors.green, '$filesCount files', () => Get.toNamed('/documents')),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Recent Activity Title
                        const Text(
                          'Recent Activity',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),
                        
                        (() {
                          final recents = List<dynamic>.from(controller.items)
                            ..sort((a, b) {
                              final aDate = DateTime.tryParse(a['createdAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
                              final bDate = DateTime.tryParse(b['createdAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
                              return bDate.compareTo(aDate);
                            });
                          final topRecents = recents.take(5).toList();

                          if (topRecents.isEmpty) {
                            return Container(
                              padding: const EdgeInsets.symmetric(vertical: 20),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: AppTheme.surfaceColor.withOpacity(0.3),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white10),
                              ),
                              child: const Text('No recent activity.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            );
                          }

                          return ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: topRecents.length,
                            separatorBuilder: (c, i) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final item = topRecents[index];
                              final type = item['type']?.toString() ?? 'document';
                              IconData icon = Icons.description_outlined;
                              Color iconColor = Colors.green;
                              
                              if (type == 'note') {
                                icon = Icons.notes_outlined;
                                iconColor = Colors.orange;
                              } else if (type == 'card') {
                                icon = Icons.credit_card_outlined;
                                iconColor = Colors.purple;
                              }

                              return Card(
                                color: AppTheme.surfaceColor,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: const BorderSide(color: Colors.white10),
                                ),
                                child: ListTile(
                                  leading: Icon(icon, color: iconColor),
                                  title: FutureBuilder<String>(
                                    future: controller.decryptField(item['encryptedTitle']),
                                    builder: (context, snapshot) {
                                      return Text(
                                        snapshot.data ?? 'Decrypting...',
                                        style: const TextStyle(fontWeight: FontWeight.bold),
                                      );
                                    },
                                  ),
                                  subtitle: Text(
                                    '${type.toUpperCase()} • ${item['createdAt'] != null ? item['createdAt'].toString().split('T').first : ''}',
                                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                                  ),
                                  onTap: () {
                                    if (type == 'note') {
                                      Get.toNamed('/note-detail', arguments: item);
                                    } else if (type == 'card') {
                                      Get.toNamed('/cards');
                                    } else if (type == 'document') {
                                      Get.toNamed('/documents');
                                    }
                                  },
                                ),
                              );
                            },
                          );
                        })(),
                        const SizedBox(height: 24),

                        // Favorites Checklist Title
                        const Text(
                          'Favorites',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),

                        if (favorites.isEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 40),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppTheme.surfaceColor.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.white10),
                            ),
                            child: const Column(
                              children: [
                                Icon(Icons.star_border_outlined, color: Colors.grey, size: 40),
                                SizedBox(height: 8),
                                Text('No favorite items marked.', style: TextStyle(color: Colors.grey)),
                              ],
                            ),
                          )
                        else
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: favorites.length,
                            separatorBuilder: (c, i) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final item = favorites[index];
                              final type = item['type']?.toString() ?? 'document';
                              IconData icon = Icons.description_outlined;
                              Color iconColor = Colors.green;
                              
                              if (type == 'note') {
                                icon = Icons.notes_outlined;
                                iconColor = Colors.orange;
                              } else if (type == 'card') {
                                icon = Icons.credit_card_outlined;
                                iconColor = Colors.purple;
                              }

                              return Card(
                                color: AppTheme.surfaceColor,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: const BorderSide(color: Colors.white10),
                                ),
                                child: ListTile(
                                  leading: Icon(icon, color: iconColor),
                                  title: FutureBuilder<String>(
                                    future: controller.decryptField(item['encryptedTitle']),
                                    builder: (context, snapshot) {
                                      return Text(
                                        snapshot.data ?? 'Decrypting...',
                                        style: const TextStyle(fontWeight: FontWeight.bold),
                                      );
                                    },
                                  ),
                                  subtitle: Text(
                                    '${type.toUpperCase()} • ${item['createdAt'] != null ? item['createdAt'].toString().split('T').first : ''}',
                                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                                  ),
                                  trailing: IconButton(
                                    icon: const Icon(Icons.star, color: Colors.yellow),
                                    onPressed: () => controller.toggleFavorite(item),
                                  ),
                                  onTap: () {
                                    if (type == 'note') {
                                      Get.toNamed('/note-detail', arguments: item);
                                    } else if (type == 'card') {
                                      Get.toNamed('/cards');
                                    } else if (type == 'document') {
                                      Get.toNamed('/documents');
                                    }
                                  },
                                ),
                              );
                            },
                          ),
                      ],
                    );
                  }),
                ],
              ),
            ),
          ),
          const UploadProgressOverlay(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: AppTheme.backgroundColor,
        child: const Icon(Icons.add),
        onPressed: () => _showQuickActionSheet(context),
      ),
    );
  }

  void _showQuickActionSheet(BuildContext context) {
    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Add to Vault',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: const Icon(Icons.note_alt_outlined, color: Colors.orange),
              title: const Text('Create Secure Note'),
              onTap: () {
                Get.back();
                Get.toNamed('/note-detail'); // Empty note detail opens editor
              },
            ),
            ListTile(
              leading: const Icon(Icons.credit_card_outlined, color: Colors.purple),
              title: const Text('Register Secure Card'),
              onTap: () {
                Get.back();
                Get.toNamed('/add-card');
              },
            ),
            ListTile(
              leading: const Icon(Icons.upload_file_outlined, color: Colors.green),
              title: const Text('Upload Encrypted File'),
              onTap: () {
                Get.back();
                Get.toNamed('/documents');
              },
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryCard(String name, IconData icon, Color color, String subtitle, VoidCallback onTap) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 24),
                const SizedBox(height: 8),
                Text(
                  name,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(color: Colors.grey, fontSize: 10),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
