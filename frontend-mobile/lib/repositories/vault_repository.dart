import '../services/api_service.dart';
import '../services/cache_service.dart';

/// Repository coordinating api fetching vs local database caching.
class VaultRepository {
  final ApiService apiService;
  final CacheService cacheService;

  VaultRepository({
    required this.apiService,
    required this.cacheService
  });

  /**
   * Fetch folders owned by user. Falls back to cached local box when offline.
   * @param userId - active account ID.
   * @returns list of folder maps.
   */
  Future<List<dynamic>> fetchFolders(String userId) async {
    try {
      final response = await apiService.dio.get('/vault/folders');
      if (response.statusCode == 200) {
        final List<dynamic> folders = response.data['data'];
        // Cache locally
        await cacheService.write('${userId}_folders', folders);
        return folders;
      }
    } catch (e) {
      // Offline fallback: query local cache box
      final cached = cacheService.read('${userId}_folders');
      if (cached != null) {
        return cached as List<dynamic>;
      }
    }
    return [];
  }

  /**
   * Fetch vault items owned by user. Falls back to cache if network fails.
   * @param userId - active account ID.
   * @returns list of vault items.
   */
  Future<List<dynamic>> fetchVaultItems(String userId) async {
    try {
      final response = await apiService.dio.get('/vault/items');
      if (response.statusCode == 200) {
        final List<dynamic> items = response.data['data'];
        await cacheService.write('${userId}_items', items);
        return items;
      }
    } catch (e) {
      final cached = cacheService.read('${userId}_items');
      if (cached != null) {
        return cached as List<dynamic>;
      }
    }
    return [];
  }
}
