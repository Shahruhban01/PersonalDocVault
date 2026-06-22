import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_theme.dart';
import '../../viewmodels/vault_viewmodel.dart';

/// Screen presenting rich text secure note editor and client-side encryption controls.
class NoteDetailView extends StatefulWidget {
  const NoteDetailView({Key? key}) : super(key: key);

  @override
  State<NoteDetailView> createState() => _NoteDetailViewState();
}

class _NoteDetailViewState extends State<NoteDetailView> {
  final VaultViewModel controller = Get.find<VaultViewModel>();
  
  late final dynamic note;
  late final bool isEditMode;
  
  final TextEditingController titleController = TextEditingController();
  final TextEditingController bodyController = TextEditingController();
  
  bool isDecrypting = true;
  bool isPreviewMode = false;

  @override
  void initState() {
    super.initState();
    note = Get.arguments;
    isEditMode = note != null;
    _initializeData();
  }

  Future<void> _initializeData() async {
    if (!isEditMode) {
      setState(() {
        isDecrypting = false;
      });
      return;
    }

    try {
      final decryptedTitle = await controller.decryptField(note['encryptedTitle']);
      titleController.text = decryptedTitle;

      final bodyPayload = note['encryptedPayload']?['encryptedBody']?.toString();
      if (bodyPayload != null) {
        final decryptedBody = await controller.decryptField(bodyPayload);
        bodyController.text = decryptedBody;
      }
    } catch (e) {
      debugPrint('Initialization decryption error: $e');
    } finally {
      setState(() {
        isDecrypting = false;
      });
    }
  }

  @override
  void dispose() {
    titleController.dispose();
    bodyController.dispose();
    super.dispose();
  }

  void _saveNote() async {
    final title = titleController.text.trim();
    final body = bodyController.text;

    bool success;
    if (isEditMode) {
      final itemId = note['id']?.toString() ?? note['_id']?.toString() ?? '';
      success = await controller.updateNote(itemId, title, body);
    } else {
      success = await controller.createNote(title, body);
    }

    if (success) {
      Get.back();
      Get.snackbar(
        'Success',
        'Note saved and encrypted successfully.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.green,
        colorText: Colors.white,
      );
    } else {
      Get.snackbar(
        'Error',
        'Failed to encrypt and save note.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  void _deleteNote() async {
    final itemId = note['id']?.toString() ?? note['_id']?.toString();
    if (itemId == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Note'),
        content: const Text('Are you sure you want to permanently delete this note? This action is irreversible.'),
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
      final deleted = await controller.deleteItem(itemId);
      if (deleted) {
        Get.back();
        Get.snackbar(
          'Deleted',
          'Note deleted successfully.',
          snackPosition: SnackPosition.BOTTOM,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isDecrypting) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Decrypting note inside hardware sandbox memory...', style: TextStyle(color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditMode ? 'Edit Note' : 'New Note'),
        actions: [
          if (isEditMode) ...[
            IconButton(
              icon: Icon(
                note['isFavorite'] == true ? Icons.star : Icons.star_border,
                color: note['isFavorite'] == true ? Colors.yellow : Colors.grey,
              ),
              onPressed: () {
                controller.toggleFavorite(note);
                setState(() {
                  note['isFavorite'] = !(note['isFavorite'] == true);
                });
              },
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: _deleteNote,
            ),
          ],
          IconButton(
            icon: Icon(isPreviewMode ? Icons.edit_note_outlined : Icons.remove_red_eye_outlined),
            onPressed: () {
              setState(() {
                isPreviewMode = !isPreviewMode;
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.check, color: AppTheme.primaryColor),
            onPressed: _saveNote,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Title Text Field
            TextField(
              controller: titleController,
              enabled: !isPreviewMode,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
              decoration: const InputDecoration(
                hintText: 'Note Title',
                border: InputBorder.none,
                focusedBorder: InputBorder.none,
                fillColor: Colors.transparent,
                contentPadding: EdgeInsets.zero,
              ),
            ),
            const Divider(color: Colors.white10, height: 20),
            
            // Rich Preview Mode vs Text Area
            Expanded(
              child: isPreviewMode
                ? Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceColor.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: SingleChildScrollView(
                      child: _buildMarkdownPreview(bodyController.text),
                    ),
                  )
                : TextField(
                    controller: bodyController,
                    maxLines: null,
                    expands: true,
                    keyboardType: TextInputType.multiline,
                    style: const TextStyle(fontSize: 16, fontFamily: 'monospace', color: AppTheme.textMutedColor),
                    decoration: const InputDecoration(
                      hintText: 'Write encrypted thoughts here...',
                      border: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      fillColor: Colors.transparent,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
            ),
            if (!isPreviewMode) ...[
              const SizedBox(height: 8),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Supports: **bold**, *italics*, and `code` formatting.',
                  style: TextStyle(color: Colors.grey, fontSize: 10),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Parses basic markdown styling rules for notes preview mode.
  Widget _buildMarkdownPreview(String rawText) {
    if (rawText.isEmpty) {
      return const Text('No content preview available.', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic));
    }

    final spans = <TextSpan>[];
    
    // Split by lines to preserve spacing
    final lines = rawText.split('\n');
    for (var i = 0; i < lines.length; i++) {
      final line = lines[i];
      _parseLine(line, spans);
      if (i < lines.length - 1) {
        spans.add(const TextSpan(text: '\n'));
      }
    }

    return RichText(
      text: TextSpan(
        style: const TextStyle(fontSize: 16, height: 1.5, color: Colors.white),
        children: spans,
      ),
    );
  }

  void _parseLine(String line, List<TextSpan> spans) {
    final regex = RegExp(r'(\*\*.*?\*\*|\*.*?\*|`.*?`)');
    final matches = regex.allMatches(line);

    if (matches.isEmpty) {
      spans.add(TextSpan(text: line));
      return;
    }

    var lastIndex = 0;
    for (final match in matches) {
      // Append preceding plain text
      if (match.start > lastIndex) {
        spans.add(TextSpan(text: line.substring(lastIndex, match.start)));
      }

      final token = match.group(0)!;
      if (token.startsWith('**') && token.endsWith('**')) {
        spans.add(TextSpan(
          text: token.substring(2, token.length - 2),
          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ));
      } else if (token.startsWith('*') && token.endsWith('*')) {
        spans.add(TextSpan(
          text: token.substring(1, token.length - 1),
          style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.white70),
        ));
      } else if (token.startsWith('`') && token.endsWith('`')) {
        spans.add(TextSpan(
          text: token.substring(1, token.length - 1),
          style: TextStyle(
            backgroundColor: Colors.black.withOpacity(0.5),
            color: Colors.amber[300],
            fontFamily: 'monospace',
          ),
        ));
      }

      lastIndex = match.end;
    }

    if (lastIndex < line.length) {
      spans.add(TextSpan(text: line.substring(lastIndex)));
    }
  }
}
