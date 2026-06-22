import 'package:get/get.dart';
import '../../views/auth/login_view.dart';
import '../../views/dashboard/dashboard_view.dart';
import '../../views/notes/notes_list_view.dart';
import '../../views/notes/note_detail_view.dart';
import '../../views/cards/cards_list_view.dart';
import '../../views/cards/add_card_view.dart';
import '../../views/documents/documents_view.dart';
import '../../views/settings/settings_view.dart';
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
    GetPage(
      name: Routes.NOTES,
      page: () => const NotesListView(),
    ),
    GetPage(
      name: Routes.NOTE_DETAIL,
      page: () => const NoteDetailView(),
    ),
    GetPage(
      name: Routes.CARDS,
      page: () => const CardsListView(),
    ),
    GetPage(
      name: Routes.ADD_CARD,
      page: () => const AddCardView(),
    ),
    GetPage(
      name: Routes.DOCUMENTS,
      page: () => const DocumentsView(),
    ),
    GetPage(
      name: Routes.SETTINGS,
      page: () => const SettingsView(),
    ),
  ];
}
