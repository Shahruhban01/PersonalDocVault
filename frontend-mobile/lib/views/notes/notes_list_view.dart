import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_theme.dart';
import '../../viewmodels/vault_viewmodel.dart';

/// Screen listing all secure client-side encrypted notes with search filter.
class NotesListView extends StatefulWidget {
  const NotesListView({Key? key}) : super(key: key);

  @override
  State<NotesListView> createState() => _NotesListViewState();
}

class _NotesListViewState extends State<NotesListView> {
  final VaultViewModel controller = Get.find<VaultViewModel>();
  final TextEditingController searchController = TextEditingController();
  final RxString query = ''.obs;

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Secure Notes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_outlined),
            onPressed: () => Get.toNamed('/note-detail'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search input box
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: searchController,
              onChanged: (val) => query.value = val.toLowerCase(),
              decoration: InputDecoration(
                hintText: 'Search encrypted notes...',
                prefixIcon: const Icon(Icons.search_outlined),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear_outlined),
                  onPressed: () {
                    searchController.clear();
                    query.value = '';
                  },
                ),
              ),
            ),
          ),

          // Reactive list of notes
          Expanded(
            child: Obx(() {
              final notes = controller.items.where((x) => x['type'] == 'note').toList();
              if (controller.isLoading.value && notes.isEmpty) {
                return const Center(child: CircularProgressIndicator());
              }

              if (notes.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.note_alt_outlined, color: Colors.grey, size: 64),
                      SizedBox(height: 16),
                      Text('No secure notes found.', style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                );
              }

              return FutureBuilder<List<Map<String, dynamic>>>(
                future: _decryptAndFilterNotes(notes),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting && snapshot.data == null) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final decryptedNotes = snapshot.data ?? [];
                  final filteredNotes = decryptedNotes.where((note) {
                    final title = note['decryptedTitle']?.toString().toLowerCase() ?? '';
                    return title.contains(query.value);
                  }).toList();

                  if (filteredNotes.isEmpty) {
                    return const Center(
                      child: Text('No notes match your search query.', style: TextStyle(color: Colors.grey)),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: filteredNotes.length,
                    separatorBuilder: (c, i) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final itemWrapper = filteredNotes[index];
                      final item = itemWrapper['originalItem'];
                      final decryptedTitle = itemWrapper['decryptedTitle'];
                      final isFavorite = item['isFavorite'] == true;

                      return Card(
                        color: AppTheme.surfaceColor,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: const BorderSide(color: Colors.white10),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          leading: const CircleAvatar(
                            backgroundColor: Colors.orange,
                            foregroundColor: AppTheme.backgroundColor,
                            child: Icon(Icons.description_outlined),
                          ),
                          title: Text(
                            decryptedTitle,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 4.0),
                            key: ValueKey(item['id']),
                            child: Text(
                              'Created: ${item['createdAt']?.toString().split('T').first ?? ''}',
                              style: const TextStyle(color: Colors.grey, fontSize: 11),
                            ),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: Icon(
                                  isFavorite ? Icons.star : Icons.star_border,
                                  color: isFavorite ? Colors.yellow : Colors.grey,
                                ),
                                onPressed: () => controller.toggleFavorite(item),
                              ),
                              const Icon(Icons.arrow_forward_ios_outlined, size: 14, color: Colors.grey),
                            ],
                          ),
                          onTap: () => Get.toNamed('/note-detail', arguments: item),
                        ),
                      );
                    },
                  );
                },
              );
            }),
          ),
        ],
      ),
    );
  }

  /// Decrypts notes titles in parallel to support local filtering/searching.
  Future<List<Map<String, dynamic>>> _decryptAndFilterNotes(List<dynamic> rawNotes) async {
    final list = <Map<String, dynamic>>[];
    for (final note in rawNotes) {
      final decrypted = await controller.decryptField(note['encryptedTitle']);
      list.add({
        'decryptedTitle': decrypted,
        'originalItem': note,
      });
    }
    return list;
  }
}
