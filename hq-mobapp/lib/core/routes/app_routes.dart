import 'package:flutter/material.dart';
import '../../screens/splash_screen.dart';
import '../../screens/login_screen.dart';
import '../../screens/register_screen.dart';
import '../../screens/dashboard_screen.dart';
import '../../screens/queue_monitoring_screen.dart';
import '../../screens/join_queue_screen.dart';
import '../../screens/chatbot_screen.dart';
import '../../screens/book_appointment_screen.dart';
import '../../screens/appointments_screen.dart';
import '../../screens/profile_screen.dart';
import '../../screens/notifications_screen.dart';
import '../../screens/clinic_directory_screen.dart';
import '../../screens/clinic_detail_screen.dart';
import '../../screens/clinic_map_screen.dart';
import '../../screens/queue_status_screen.dart';
import '../../screens/home_screen.dart';

class AppRoutes {
  static const splash          = '/';
  static const login           = '/login';
  static const register        = '/register';
  static const home            = '/home';
  static const dashboard       = '/dashboard';
  static const queueMonitoring = '/queue';
  static const queueStatus     = '/queue-status';
  static const joinQueue       = '/join-queue';
  static const chatBot         = '/chat';
  static const bookAppointment = '/book-appointment';
  static const appointments    = '/appointments';
  static const profile         = '/profile';
  static const notifications   = '/notifications';
  static const clinicDirectory = '/clinics';
  static const clinicDetail    = '/clinic-detail';
  static const clinicMap       = '/clinic-map';

  static Map<String, WidgetBuilder> get routes => {
    splash:          (_) => const SplashScreen(),
    login:           (_) => const LoginScreen(),
    register:        (_) => const RegisterScreen(),
    home:            (_) => const HomeScreen(),
    dashboard:       (_) => const DashboardScreen(),
    queueMonitoring: (_) => const QueueMonitoringScreen(),
    queueStatus:     (_) => const QueueStatusScreen(),
    joinQueue:       (_) => const JoinQueueScreen(),
    bookAppointment: (_) => const BookAppointmentScreen(),
    appointments:    (_) => const AppointmentsScreen(),
    profile:         (_) => const ProfileScreen(),
    notifications:   (_) => const NotificationsScreen(),
    clinicDirectory: (_) => const ClinicDirectoryScreen(),
    clinicDetail:    (_) => const ClinicDetailScreen(),
    clinicMap:       (_) => const ClinicMapScreen(),
    chatBot: (context) => ChatbotScreen(
      onBookAppointment: () => Navigator.pushNamed(context, bookAppointment),
      onViewQueue:       () => Navigator.pushNamed(context, queueMonitoring),
    ),
  };
}
