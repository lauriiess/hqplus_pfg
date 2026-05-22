import 'package:flutter/material.dart';
import '../../screens/splash_screen.dart';
import '../../screens/login_screen.dart';
import '../../screens/register_screen.dart';
import '../../screens/home_screen.dart';
import '../../screens/clinic_directory_screen.dart';
import '../../screens/clinic_detail_screen.dart';
import '../../screens/queue_status_screen.dart';
import '../../screens/appointments_screen.dart';
import '../../screens/book_appointment_screen.dart';
import '../../screens/notifications_screen.dart';
import '../../screens/profile_screen.dart';
import '../../screens/chatbot_screen.dart';

class AppRoutes {
  static const splash          = '/';
  static const login           = '/login';
  static const register        = '/register';
  static const home            = '/home';
  static const clinicDirectory = '/clinics';
  static const clinicDetail    = '/clinic-detail';
  static const queueStatus     = '/queue-status';
  static const appointments    = '/appointments';
  static const bookAppointment = '/book-appointment';
  static const notifications   = '/notifications';
  static const profile         = '/profile';
  static const chatbot         = '/chatbot';

  static Map<String, WidgetBuilder> get routes => {
    splash:          (_) => const SplashScreen(),
    login:           (_) => const LoginScreen(),
    register:        (_) => const RegisterScreen(),
    home:            (_) => const HomeScreen(),
    clinicDirectory: (_) => const ClinicDirectoryScreen(),
    clinicDetail:    (_) => const ClinicDetailScreen(),
    queueStatus:     (_) => const QueueStatusScreen(),
    appointments:    (_) => const AppointmentsScreen(),
    bookAppointment: (_) => const BookAppointmentScreen(),
    notifications:   (_) => const NotificationsScreen(),
    profile:         (_) => const ProfileScreen(),
    chatbot:         (_) => const ChatbotScreen(),
  };
}
