import 'package:get_storage/get_storage.dart';

/// Cache Service managing local encrypted metadata box tables.
class CacheService {
  final _storage = GetStorage('vault_cache');

  /**
   * Write data values to local encrypted cache box.
   * @param key - Identifier index.
   * @param value - Value map/string.
   */
  Future<void> write(String key, dynamic value) async {
    await _storage.write(key, value);
  }

  /**
   * Read cached value.
   * @param key - Identifier index.
   * @returns dynamic value or null.
   */
  dynamic read(String key) {
    return _storage.read(key);
  }

  /**
   * Clear cache box.
   */
  Future<void> clear() async {
    await _storage.erase();
  }
}
