import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../core/routes/app_routes.dart';
import '../core/theme/app_theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigate();
  }

  Future<void> _navigate() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    final state = context.read<AppState>();
    // Give session restoration a moment
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;
    Navigator.pushReplacementNamed(
      context,
      state.isLoggedIn ? AppRoutes.home : AppRoutes.login,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.bgTop, AppColors.bgBottom],
          ),
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircleAvatar(
                radius: 48,
                backgroundColor: Colors.white,
                child: Icon(Icons.local_hospital_rounded, color: AppColors.primary, size: 52),
              ),
              SizedBox(height: 24),
              Text('HealthQueue+',
                style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
              SizedBox(height: 8),
              Text('Your health, on time.',
                style: TextStyle(color: Colors.white70, fontSize: 15)),
              SizedBox(height: 48),
              CircularProgressIndicator(color: Colors.white54, strokeWidth: 2),
            ],
          ),
        ),
      ),
    );
  }
}
