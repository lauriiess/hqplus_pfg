import 'package:flutter/material.dart';
import '../../screens/login_screen.dart';
import '../../screens/register_screen.dart';
import '../../screens/dashboard_screen.dart';
import '../../screens/queue_monitoring_screen.dart';
import '../../screens/join_queue_screen.dart';
import '../../screens/chatbot_screen.dart';
import '../../screens/book_appointment_screen.dart';
import '../../screens/appointments_screen.dart';
import '../../screens/profile_screen.dart';

class AppRoutes {
  static const login           = '/login';
  static const register        = '/register';
  static const dashboard       = '/dashboard';
  static const queueMonitoring = '/queue';
  static const joinQueue       = '/join-queue';
  static const chatBot         = '/chat';
  static const bookAppointment = '/book-appointment';
  static const appointments    = '/appointments';
  static const profile         = '/profile';

  static Map<String, WidgetBuilder> get routes => {
    login:           (_) => const LoginScreen(),
    register:        (_) => const RegisterScreen(),
    dashboard:       (_) => const DashboardScreen(),
    queueMonitoring: (_) => const QueueMonitoringScreen(),
    joinQueue:       (_) => const JoinQueueScreen(),
    bookAppointment: (_) => const BookAppointmentScreen(),
    appointments:    (_) => const AppointmentsScreen(),
    profile:         (_) => const ProfileScreen(),
    chatBot: (context) => ChatbotScreen(
      onBookAppointment: () => Navigator.pushNamed(context, bookAppointment),
      onViewQueue:       () => Navigator.pushNamed(context, queueMonitoring),
    ),
  };
}
