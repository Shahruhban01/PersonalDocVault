import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import 'package:open_filex/open_filex.dart';
import '../../core/theme/app_theme.dart';
import '../../viewmodels/vault_viewmodel.dart';

/// Screen managing secure client-side encrypted document cabinet uploads and downloads.
class DocumentsView extends StatefulWidget {
  const DocumentsView({Key? key}) : super(key: key);

  @override
  State<DocumentsView> createState() => _DocumentsViewState();
}

class _DocumentsViewState extends State<DocumentsView> {
  final VaultViewModel controller = Get.find<VaultViewModel>();

  /// Helper to convert file size bytes to human-readable format.
  String _formatBytes(int bytes) {
    if (bytes <= 0) return '0 B';
    const suffixes = ['B', 'KB', 'MB', 'GB'];
    var i = 0;
    double size = bytes.toDouble();
    while (size >= 1024 && i < suffixes.length - 1) {
      size /= 1024;
      i++;
    }
    return '${size.toStringAsFixed(1)} ${suffixes[i]}';
  }

  void _pickAndUploadFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        allowMultiple: false,
      );

      if (result == null || result.files.single.path == null) return;
      final file = File(result.files.single.path!);
      final defaultName = result.files.single.name;

      // Prompt user for a friendly display title
      final titleController = TextEditingController(text: defaultName.split('.').first);
      final title = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Encrypt and Upload'),
          content: TextField(
            controller: titleController,
            decoration: const InputDecoration(
              labelText: 'Document Title',
              hintText: 'Enter a friendly title for this file',
            ),
          ),
          actions: [
            TextButton(
              child: const Text('Cancel'),
              onPressed: () => Navigator.of(context).pop(),
            ),
            TextButton(
              child: const Text('Encrypt & Upload', style: TextStyle(color: AppTheme.primaryColor)),
              onPressed: () => Navigator.of(context).pop(titleController.text),
            ),
          ],
        ),
      );

      if (title != null && title.trim().isNotEmpty) {
        final success = await controller.uploadDocument(title, file);
        if (success) {
          Get.snackbar(
            'Uploaded',
            'File encrypted client-side and synced successfully.',
            snackPosition: SnackPosition.BOTTOM,
            backgroundColor: Colors.green,
            colorText: Colors.white,
          );
        } else {
          Get.snackbar(
            'Upload Error',
            'Failed to encrypt or upload document.',
            snackPosition: SnackPosition.BOTTOM,
            backgroundColor: Colors.red,
            colorText: Colors.white,
          );
        }
      }
    } catch (e) {
      debugPrint('File picking error: $e');
    }
  }

  void _downloadAndOpenDocument(dynamic item) async {
    Get.snackbar(
      'Decrypting',
      'Downloading encrypted binary and unlocking file...',
      snackPosition: SnackPosition.BOTTOM,
      showProgressIndicator: true,
      duration: const Duration(seconds: 4),
    );

    final localPath = await controller.downloadAndDecryptDocument(item);

    if (localPath != null) {
      // Clear current snackbars
      Get.closeAllSnackbars();
      
      // Open file in sandbox reader
      final openResult = await OpenFilex.open(localPath);
      if (openResult.type != ResultType.done) {
        Get.snackbar(
          'Viewer Info',
          'Downloaded and decrypted successfully to temporary sandbox. Unable to open: ${openResult.message}',
          snackPosition: SnackPosition.BOTTOM,
        );
      }
    } else {
      Get.closeAllSnackbars();
      Get.snackbar(
        'Error',
        'Failed to download or decrypt file.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  void _confirmDelete(dynamic item) async {
    final itemId = item['id']?.toString() ?? item['_id']?.toString();
    if (itemId == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete File'),
        content: const Text('Are you sure you want to permanently delete this encrypted file? This will remove it from R2 storage.'),
        actions: [
          TextButton(
            child: const Text('Cancel'),
            onPressed: () => Navigator.of(context).pop(false),
          ),
          TextButton(
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
            onPressed: () => Navigator.of(context).pop(true),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await controller.deleteItem(itemId);
      if (success) {
        Get.snackbar('Deleted', 'File deleted successfully.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Document Cabinet'),
        actions: [
          IconButton(
            icon: const Icon(Icons.upload_file_outlined),
            onPressed: _pickAndUploadFile,
          ),
        ],
      ),
      body: Obx(() {
        final docs = controller.items.where((x) => x['type'] == 'document').toList();

        if (controller.isLoading.value && docs.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (docs.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.folder_zip_outlined, color: Colors.grey, size: 64),
                const SizedBox(height: 16),
                const Text('No secure documents found.', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  icon: const Icon(Icons.upload_file_outlined),
                  label: const Text('Select File to Encrypt'),
                  onPressed: _pickAndUploadFile,
                ),
              ],
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: docs.length,
          separatorBuilder: (c, i) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final doc = docs[index];
            final sizeBytes = doc['fileMetadata']?['fileSize'] as int? ?? 0;
            final mime = doc['fileMetadata']?['fileMimeType']?.toString() ?? 'unknown';
            final isFavorite = doc['isFavorite'] == true;

            return Card(
              color: AppTheme.surfaceColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Colors.white10),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                leading: CircleAvatar(
                  backgroundColor: Colors.green.withOpacity(0.2),
                  foregroundColor: Colors.green,
                  child: const Icon(Icons.insert_drive_file_outlined),
                ),
                title: FutureBuilder<String>(
                  future: controller.decryptField(doc['encryptedTitle']),
                  builder: (c, s) => Text(
                    s.data ?? 'Decrypting...',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                  ),
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 6.0),
                  child: Text(
                    '${_formatBytes(sizeBytes)} • ${mime.split('/').last.toUpperCase()} • ${doc['createdAt']?.toString().split('T').first ?? ''}',
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
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
                      onPressed: () => controller.toggleFavorite(doc),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                      onPressed: () => _confirmDelete(doc),
                    ),
                  ],
                ),
                onTap: () => _downloadAndOpenDocument(doc),
              ),
            );
          },
        );
      }),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: AppTheme.backgroundColor,
        child: const Icon(Icons.file_upload),
        onPressed: _pickAndUploadFile,
      ),
    );
  }
}
