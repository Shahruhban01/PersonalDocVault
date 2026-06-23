import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'app/routes/app_pages.dart';
import 'app/routes/app_routes.dart';
import 'core/theme/app_theme.dart';
import 'services/api_service.dart';
import 'services/cache_service.dart';
import 'services/crypto_service.dart';
import 'services/session_service.dart';
import 'repositories/vault_repository.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await GetStorage.init();
  
  // Register global services
  final api = Get.put(ApiService());
  final cache = Get.put(CacheService());
  Get.put(CryptoService());
  final session = Get.put(SessionService());
  Get.put(VaultRepository(apiService: api, cacheService: cache));
  
  // Check if session exists in secure storage
  final hasSession = await session.initSecureSession();
  
  runApp(PersonalVaultApp(initialRoute: hasSession ? Routes.LOCK : Routes.LOGIN));
}

class PersonalVaultApp extends StatelessWidget {
  final String initialRoute;
  const PersonalVaultApp({Key? key, required this.initialRoute}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: 'Personal Vault',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      initialRoute: initialRoute,
      getPages: AppPages.routes,
    );
  }
}
