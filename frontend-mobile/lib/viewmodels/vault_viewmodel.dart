import 'dart:convert';
import 'package:dio/dio.dart' as dio;
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import '../services/api_service.dart';
import '../services/crypto_service.dart';
import '../services/session_service.dart';
import '../repositories/vault_repository.dart';

/// Central state manager coordinating local cryptography and syncing vault items (Notes, Cards, Documents).
class VaultViewModel extends GetxController {
  final ApiService _apiService = Get.find<ApiService>();
  final CryptoService _cryptoService = Get.find<CryptoService>();
  final SessionService _sessionService = Get.find<SessionService>();
  final VaultRepository _vaultRepository = Get.find<VaultRepository>();

  final RxList<dynamic> items = <dynamic>[].obs;
  final RxList<dynamic> folders = <dynamic>[].obs;
  final RxBool isLoading = false.obs;
  final RxString error = ''.obs;

  // Upload progress states
  final RxDouble uploadProgress = 0.0.obs;
  final RxString uploadStatus = 'idle'.obs; // idle, encrypting, uploading, completed, error
  final RxString uploadingFileName = ''.obs;

  // Search query & Cache for decrypted titles to enable instant synchronous search
  final RxString searchQuery = ''.obs;
  final Map<String, String> decryptedTitleCache = <String, String>{};

  @override
  void onInit() {
    super.onInit();
    loadVault();
  }

  /// Reload items and folders list from backend (falling back to cache when offline).
  Future<void> loadVault() async {
    final userId = _sessionService.userData?['id']?.toString() ?? 'anonymous';
    try {
      isLoading.value = true;
      error.value = '';
      
      final fetchedItems = await _vaultRepository.fetchVaultItems(userId);
      final fetchedFolders = await _vaultRepository.fetchFolders(userId);

      items.assignAll(fetchedItems);
      folders.assignAll(fetchedFolders);

      // Populate decrypted title cache for instant local searching
      _preDecryptAllTitles();
    } catch (e) {
      error.value = 'Failed to load vault items.';
      debugPrint('Load vault items error: $e');
    } finally {
      isLoading.value = false;
    }
  }

  /// Decrypt all titles in the background so search filters are responsive.
  Future<void> _preDecryptAllTitles() async {
    for (final item in items) {
      final itemId = item['id']?.toString() ?? item['_id']?.toString() ?? '';
      if (itemId.isNotEmpty) {
        final title = await decryptField(item['encryptedTitle']);
        decryptedTitleCache[itemId] = title;
      }
    }
    for (final folder in folders) {
      final folderId = folder['id']?.toString() ?? folder['_id']?.toString() ?? '';
      if (folderId.isNotEmpty) {
        final name = await decryptField(folder['encryptedName']);
        decryptedTitleCache[folderId] = name;
      }
    }
  }

  /// Dynamic search results computed reactively
  List<dynamic> get filteredItems {
    final query = searchQuery.value.trim().toLowerCase();
    if (query.isEmpty) {
      return items;
    }
    return items.where((item) {
      final itemId = item['id']?.toString() ?? item['_id']?.toString() ?? '';
      final cachedTitle = decryptedTitleCache[itemId]?.toLowerCase() ?? '';
      final type = (item['type']?.toString() ?? '').toLowerCase();
      return cachedTitle.contains(query) || type.contains(query);
    }).toList();
  }

  List<int> get _masterKey {
    final key = _sessionService.masterKey;
    if (key == null) {
      throw StateError('Vault is locked. Decryption key missing from memory.');
    }
    return key;
  }

  /// Decrypt a JSON string object representing {cipherText, nonce, mac}.
  Future<String> decryptField(String? jsonString, {String fallback = ''}) async {
    if (jsonString == null || jsonString.isEmpty) return fallback;
    try {
      final data = json.decode(jsonString);
      final cipherText = data['cipherText']?.toString();
      final nonce = data['nonce']?.toString();
      final mac = data['mac']?.toString();
      if (cipherText == null || nonce == null || mac == null) return fallback;
      return await _cryptoService.decrypt(cipherText, nonce, mac, _masterKey);
    } catch (e) {
      debugPrint('Field decryption failed: $e');
      return 'Decryption Error';
    }
  }

  /// Toggle item favorite state.
  Future<void> toggleFavorite(dynamic item) async {
    final itemId = item['id']?.toString() ?? item['_id']?.toString();
    if (itemId == null) return;

    final currentFavorite = item['isFavorite'] == true;
    try {
      final response = await _apiService.dio.put('/vault/items/$itemId', data: {
        'isFavorite': !currentFavorite,
      });
      if (response.statusCode == 200) {
        final index = items.indexWhere((x) => (x['id'] ?? x['_id']) == itemId);
        if (index != -1) {
          final updated = Map<String, dynamic>.from(items[index]);
          updated['isFavorite'] = !currentFavorite;
          items[index] = updated;
        }
      }
    } catch (e) {
      debugPrint('Failed to toggle favorite: $e');
    }
  }

  /// Delete an item.
  Future<bool> deleteItem(String itemId) async {
    try {
      final response = await _apiService.dio.delete('/vault/items/$itemId');
      if (response.statusCode == 200) {
        items.removeWhere((x) => (x['id'] ?? x['_id']) == itemId);
        return true;
      }
    } catch (e) {
      debugPrint('Failed to delete vault item: $e');
    }
    return false;
  }

  // ==========================================
  // NOTE CRUD
  // ==========================================

  Future<bool> createNote(String title, String body) async {
    try {
      isLoading.value = true;
      final encTitleObj = await _cryptoService.encrypt(title.trim().isEmpty ? 'Untitled Note' : title.trim(), _masterKey);
      final encBodyObj = await _cryptoService.encrypt(body, _masterKey);

      final response = await _apiService.dio.post('/vault/notes', data: {
        'encryptedTitle': json.encode(encTitleObj),
        'encryptedBody': json.encode(encBodyObj),
      });

      if (response.statusCode == 201) {
        await loadVault();
        return true;
      }
    } catch (e) {
      debugPrint('Create note error: $e');
    } finally {
      isLoading.value = false;
    }
    return false;
  }

  Future<bool> updateNote(String itemId, String title, String body) async {
    try {
      isLoading.value = true;
      final encTitleObj = await _cryptoService.encrypt(title.trim().isEmpty ? 'Untitled Note' : title.trim(), _masterKey);
      final encBodyObj = await _cryptoService.encrypt(body, _masterKey);

      final response = await _apiService.dio.put('/vault/items/$itemId', data: {
        'encryptedTitle': json.encode(encTitleObj),
        'encryptedPayload': {
          'encryptedBody': json.encode(encBodyObj)
        }
      });

      if (response.statusCode == 200) {
        await loadVault();
        return true;
      }
    } catch (e) {
      debugPrint('Update note error: $e');
    } finally {
      isLoading.value = false;
    }
    return false;
  }

  // ==========================================
  // CARD CRUD
  // ==========================================

  Future<bool> createCard({
    required String label,
    required String brand,
    required String cardholder,
    required String number,
    required String expiry,
    required String cvv,
  }) async {
    try {
      isLoading.value = true;
      final encTitleObj = await _cryptoService.encrypt(label.trim(), _masterKey);
      final nameEnc = await _cryptoService.encrypt(cardholder.trim(), _masterKey);
      final numberEnc = await _cryptoService.encrypt(number.trim().replaceAll(' ', ''), _masterKey);
      final expiryEnc = await _cryptoService.encrypt(expiry.trim(), _masterKey);
      final cvvEnc = await _cryptoService.encrypt(cvv.trim(), _masterKey);

      final response = await _apiService.dio.post('/vault/cards', data: {
        'encryptedTitle': json.encode(encTitleObj),
        'cardBrand': brand.toLowerCase(),
        'encryptedPayload': {
          'cardholderName_enc': json.encode(nameEnc),
          'cardNumber_enc': json.encode(numberEnc),
          'expiryDate_enc': json.encode(expiryEnc),
          'cvv_enc': json.encode(cvvEnc),
        }
      });

      if (response.statusCode == 201) {
        await loadVault();
        return true;
      }
    } catch (e) {
      debugPrint('Create card error: $e');
    } finally {
      isLoading.value = false;
    }
    return false;
  }

  // ==========================================
  // DOCUMENT OPERATIONS
  // ==========================================

  Future<bool> uploadDocument(String title, File file) async {
    final fileName = file.path.split('/').last.split('\\').last;
    try {
      uploadingFileName.value = fileName;
      uploadStatus.value = 'encrypting';
      uploadProgress.value = 0.0;
      isLoading.value = true;

      final fileBytes = await file.readAsBytes();
      final checksum = await _cryptoService.computeSha256Hex(fileBytes);

      // Perform client-side encryption
      final encryptedData = await _cryptoService.encryptFile(fileBytes, _masterKey);
      final List<int> encBytes = encryptedData['encryptedBytes'];
      final String fileNonce = encryptedData['nonce'];

      final encTitleObj = await _cryptoService.encrypt(title.trim().isEmpty ? 'Untitled Document' : title.trim(), _masterKey);
      final encFileNameObj = await _cryptoService.encrypt(fileName, _masterKey);

      final formData = dio.FormData();
      formData.fields.add(MapEntry('encryptedTitle', json.encode(encTitleObj)));
      formData.fields.add(MapEntry('encryptedFileName', json.encode(encFileNameObj)));
      formData.fields.add(const MapEntry('categoryId', '60c72b9a9b1d8a23a41d5a90'));
      formData.fields.add(MapEntry('checksum', checksum));
      formData.fields.add(MapEntry('encryptedPayload', json.encode({'fileNonce': fileNonce})));

      formData.files.add(MapEntry(
        'file',
        dio.MultipartFile.fromBytes(
          encBytes,
          filename: 'encrypted.bin',
        ),
      ));

      uploadStatus.value = 'uploading';
      final response = await _apiService.dio.post(
        '/vault/documents/upload',
        data: formData,
        options: dio.Options(
          headers: {'Content-Type': 'multipart/form-data'},
        ),
        onSendProgress: (sent, total) {
          if (total > 0) {
            uploadProgress.value = sent / total;
          }
        },
      );

      if (response.statusCode == 201) {
        uploadStatus.value = 'completed';
        await loadVault();
        Future.delayed(const Duration(seconds: 3), () {
          if (uploadStatus.value == 'completed') {
            uploadStatus.value = 'idle';
          }
        });
        return true;
      }
    } catch (e) {
      uploadStatus.value = 'error';
      debugPrint('Upload document error: $e');
      Future.delayed(const Duration(seconds: 3), () {
        if (uploadStatus.value == 'error') {
          uploadStatus.value = 'idle';
        }
      });
    } finally {
      isLoading.value = false;
    }
    return false;
  }

  Future<String?> downloadAndDecryptDocument(dynamic item) async {
    final itemId = item['id']?.toString() ?? item['_id']?.toString();
    if (itemId == null) return null;

    try {
      isLoading.value = true;

      final responseUrl = await _apiService.dio.get('/vault/documents/$itemId/download');
      final downloadUrl = responseUrl.data['data']['downloadUrl']?.toString();
      if (downloadUrl == null) return null;

      final rawDio = dio.Dio();
      final fileResponse = await rawDio.get<List<int>>(
        downloadUrl,
        options: dio.Options(responseType: dio.ResponseType.bytes),
      );

      final encryptedBytes = fileResponse.data;
      if (encryptedBytes == null) return null;

      final rawPayload = item['encryptedPayload'];
      final payload = rawPayload is String ? json.decode(rawPayload) : rawPayload;
      final fileNonce = payload['fileNonce']?.toString();
      if (fileNonce == null) return null;

      final decryptedBytes = await _cryptoService.decryptFile(encryptedBytes, fileNonce, _masterKey);

      final encryptedFileName = item['fileMetadata']?['encryptedFileName']?.toString();
      String filename = 'decrypted_doc';
      if (encryptedFileName != null) {
        filename = await decryptField(encryptedFileName, fallback: 'decrypted_doc');
      }

      final tempDir = await getTemporaryDirectory();
      final localFile = File('${tempDir.path}/$filename');
      await localFile.writeAsBytes(decryptedBytes);

      return localFile.path;
    } catch (e) {
      debugPrint('Download/decrypt error: $e');
    } finally {
      isLoading.value = false;
    }
    return null;
  }

  /// Change vault passphrase, re-encrypting note titles, bodies, card credentials, and document titles
  /// client-side using a new derived key before updating the server credential password hash.
  Future<bool> changePassword(String currentPassword, String newPassword) async {
    try {
      isLoading.value = true;
      error.value = '';

      final salt = _sessionService.userData?['encryptionSalt'] ?? '';
      // 1. Verify current passphrase matches masterKey
      final currentDerivedKey = await _cryptoService.deriveKey(currentPassword.trim(), salt);
      if (currentDerivedKey.toString() != _masterKey.toString()) {
        error.value = 'Current passphrase verification failed.';
        return false;
      }

      // 2. Derive new masterKey
      final newMasterKey = await _cryptoService.deriveKey(newPassword.trim(), salt);

      // 3. Re-encrypt notes, cards, and documents metadata in memory and push to server
      for (final item in items) {
        final itemId = item['id']?.toString() ?? item['_id']?.toString() ?? '';
        final type = item['type']?.toString() ?? '';

        final title = await decryptField(item['encryptedTitle']);
        final encTitleObj = await _cryptoService.encrypt(title, newMasterKey);

        final Map<String, dynamic> updateData = {
          'encryptedTitle': json.encode(encTitleObj),
        };

        if (type == 'note') {
          final rawPayload = item['encryptedPayload'];
          final payload = rawPayload is String ? json.decode(rawPayload) : rawPayload;
          final bodyEnc = payload['encryptedBody']?.toString();
          if (bodyEnc != null) {
            final body = await decryptField(bodyEnc);
            final encBodyObj = await _cryptoService.encrypt(body, newMasterKey);
            updateData['encryptedPayload'] = {
              'encryptedBody': json.encode(encBodyObj)
            };
          }
        } else if (type == 'card') {
          final rawPayload = item['encryptedPayload'];
          final payload = rawPayload is String ? json.decode(rawPayload) : rawPayload;

          final holderName = await decryptField(payload['cardholderName_enc']?.toString());
          final cardNumber = await decryptField(payload['cardNumber_enc']?.toString());
          final expiryDate = await decryptField(payload['expiryDate_enc']?.toString());
          final cvv = await decryptField(payload['cvv_enc']?.toString());

          final encHolder = await _cryptoService.encrypt(holderName, newMasterKey);
          final encNumber = await _cryptoService.encrypt(cardNumber, newMasterKey);
          final encExpiry = await _cryptoService.encrypt(expiryDate, newMasterKey);
          final encCvv = await _cryptoService.encrypt(cvv, newMasterKey);

          updateData['encryptedPayload'] = {
            'cardholderName_enc': json.encode(encHolder),
            'cardNumber_enc': json.encode(encNumber),
            'expiryDate_enc': json.encode(encExpiry),
            'cvv_enc': json.encode(encCvv),
          };
        } else if (type == 'document') {
          final encryptedFileName = item['fileMetadata']?['encryptedFileName']?.toString();
          if (encryptedFileName != null) {
            final filename = await decryptField(encryptedFileName);
            final encFileNameObj = await _cryptoService.encrypt(filename, newMasterKey);
            updateData['encryptedFileName'] = json.encode(encFileNameObj);
          }
        }

        // Push re-encrypted item to server
        await _apiService.dio.put('/vault/items/$itemId', data: updateData);
      }

      // 4. Send new authKey hash to server
      final newPassData = utf8.encode(newPassword.trim());
      final newPasswordHash = await _cryptoService.computeSha256Hex(newPassData);

      final response = await _apiService.dio.put('/auth/change-password', data: {
        'newPasswordHash': newPasswordHash,
      });

      if (response.statusCode == 200) {
        // 5. Update session in memory and persistent secure storage
        await _sessionService.unlock(
          token: _sessionService.accessToken!,
          keyBytes: newMasterKey,
          userData: _sessionService.userData!,
        );
        // Clear decrypted title cache and reload
        decryptedTitleCache.clear();
        await loadVault();
        return true;
      }
    } catch (e) {
      error.value = 'Failed to change password: $e';
      debugPrint('Change password re-encryption error: $e');
    } finally {
      isLoading.value = false;
    }
    return false;
  }

  /// Update user display name and avatar selection on backend
  Future<bool> updateProfile({required String name, required String avatar}) async {
    try {
      isLoading.value = true;
      error.value = '';

      final response = await _apiService.dio.put('/auth/profile', data: {
        'name': name,
        'avatar': avatar,
      });

      if (response.statusCode == 200) {
        final userData = Map<String, dynamic>.from(_sessionService.userData ?? {});
        userData['name'] = name;
        userData['avatar'] = avatar;

        // Update active in-memory and hardware-backed session storage
        await _sessionService.unlock(
          token: _sessionService.accessToken!,
          keyBytes: _sessionService.masterKey!,
          userData: userData,
        );
        return true;
      }
    } catch (e) {
      error.value = 'Failed to update profile: $e';
      debugPrint('Profile update error: $e');
    } finally {
      isLoading.value = false;
    }
    return false;
  }
}
