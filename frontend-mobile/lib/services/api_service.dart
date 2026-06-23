import 'package:dio/dio.dart';
import 'package:get/get.dart' as getx;

/// API Service managing secure Dio-backed networking configurations.
class ApiService extends getx.GetxService {
  late final Dio dio;
  final String _baseUrl = 'https://vaultapi.developerruhban.online/api';
  String? _accessToken;

  /**
   * Set active session access token.
   * @param token - Bearer JWT string.
   */
  void setToken(String? token) {
    _accessToken = token;
  }

  @override
  void onInit() {
    super.onInit();
    dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
    ));

    // Register Interceptor pipelines
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        print('API: REQUEST [${options.method}] ${options.path}');
        if (_accessToken != null) {
          options.headers['Authorization'] = 'Bearer $_accessToken';
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        print('API: RESPONSE [${response.statusCode}] ${response.requestOptions.path}');
        return handler.next(response);
      },
      onError: (DioException error, handler) async {
        print('API: ERROR [${error.response?.statusCode}] ${error.message} for ${error.requestOptions.path}');
        // If access token is expired, trigger refresh rotation
        if (error.response?.statusCode == 401 && _accessToken != null) {
          try {
            // Attempt rotation
            final refreshResponse = await dio.post('/auth/refresh');
            if (refreshResponse.statusCode == 200) {
              final newToken = refreshResponse.data['data']['accessToken'];
              setToken(newToken);

              // Retry original locked call with new token properties
              error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
              final retryResponse = await dio.fetch(error.requestOptions);
              return handler.resolve(retryResponse);
            }
          } catch (refreshError) {
            // If refresh fails, purge token and redirect to login screen
            setToken(null);
            getx.Get.offAllNamed('/login');
          }
        }
        return handler.next(error);
      }
    ));
  }
}
