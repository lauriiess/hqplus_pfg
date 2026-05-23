import 'package:flutter/material.dart';
import '../../screens/splash_screen.dart';
import '../../screens/login_screen.dart';
import '../../screens/register_screen.dart';
import '../../screens/dashboard_screen.dart';
import '../../screens/join_queue_screen.dart';
import '../../screens/chatbot_screen.dart';
import '../../screens/book_appointment_screen.dart';
import '../../screens/appointments_screen.dart';
import '../../screens/notifications_screen.dart';
import '../../screens/clinic_detail_screen.dart';
import '../../screens/clinic_map_screen.dart';

class AppRoutes {
  static const splash          = '/';
  static const login           = '/login';
  static const register        = '/register';
  static const dashboard       = '/dashboard';
  static const joinQueue       = '/join-queue';
  static const chatBot         = '/chat';
  static const bookAppointment = '/book-appointment';
  static const appointments    = '/appointments';
  static const notifications   = '/notifications';
  static const clinicDetail    = '/clinic-detail';
  static const clinicMap       = '/clinic-map';

  static Map<String, WidgetBuilder> get routes => {
    splash:          (_) => const SplashScreen(),
    login:           (_) => const LoginScreen(),
    register:        (_) => const RegisterScreen(),
    dashboard:       (_) => const DashboardScreen(),
    joinQueue:       (_) => const JoinQueueScreen(),
    bookAppointment: (_) => const BookAppointmentScreen(),
    appointments:    (_) => const AppointmentsScreen(),
    notifications:   (_) => const NotificationsScreen(),
    clinicDetail:    (_) => const ClinicDetailScreen(),
    clinicMap:       (_) => const ClinicMapScreen(),
    chatBot: (context) => ChatbotScreen(
      onBookAppointment: () => Navigator.pushNamed(context, bookAppointment),
      onViewQueue:       () => Navigator.pushNamed(context, joinQueue),
    ),
  };
}
