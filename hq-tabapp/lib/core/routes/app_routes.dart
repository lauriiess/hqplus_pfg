import 'package:flutter/material.dart';
import '../../screens/login_screen.dart';
import '../../screens/dashboard_screen.dart';

class AppRoutes {
  static const login     = '/';
  static const dashboard = '/dashboard';

  static Map<String, WidgetBuilder> get routes => {
    login:     (_) => const StaffLoginScreen(),
    dashboard: (_) => const StaffDashboardScreen(),
  };
}
