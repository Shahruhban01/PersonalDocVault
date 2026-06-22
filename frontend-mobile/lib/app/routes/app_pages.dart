import 'package:get/get.dart';
import '../../views/auth/login_view.dart';
import '../../views/dashboard/dashboard_view.dart';
import 'app_routes.dart';

abstract class AppPages {
  static const INITIAL = Routes.LOGIN;

  static final routes = [
    GetPage(
      name: Routes.LOGIN,
      page: () => const LoginView(),
    ),
    GetPage(
      name: Routes.HOME,
      page: () => const DashboardView(),
    ),
  ];
}
