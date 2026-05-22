import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../core/routes/app_routes.dart';
import '../core/theme/app_theme.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  Map<String, dynamic>? _queueStatus;

  @override
  void initState() {
    super.initState();
    _loadQueueStatus();
  }

  Future<void> _loadQueueStatus() async {
    try {
      final data = await ApiService.getMyQueueStatus();
      if (mounted) setState(() => _queueStatus = data);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().currentUser;
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hi, ${user?.fullName.split(' ').first ?? 'Patient'}! 👋',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                      const SizedBox(height: 2),
                      const Text('How are you feeling today?',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                    ],
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined, color: AppColors.primary),
                    onPressed: () => Navigator.pushNamed(context, AppRoutes.notifications),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Active queue banner
              if (_queueStatus != null && (_queueStatus!['active'] == true)) ...[
                _activeQueueBanner(),
                const SizedBox(height: 20),
              ],

              // Quick actions
              const Text('Quick Actions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textDark)),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.5,
                children: [
                  _actionCard('Find Clinic', Icons.search_rounded, AppColors.primary,
                      () => Navigator.pushNamed(context, AppRoutes.clinicDirectory)),
                  _actionCard('My Queue', Icons.confirmation_num_outlined, AppColors.secondary,
                      () => Navigator.pushNamed(context, AppRoutes.queueStatus)),
                  _actionCard('Appointments', Icons.calendar_today_outlined, const Color(0xFF7B1FA2),
                      () => Navigator.pushNamed(context, AppRoutes.appointments)),
                  _actionCard('Ask AI', Icons.chat_bubble_outline, const Color(0xFFE65100),
                      () => Navigator.pushNamed(context, AppRoutes.chatbot)),
                ],
              ),
              const SizedBox(height: 24),

              // Info card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.bgTop, AppColors.bgBottom]),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.tips_and_updates_outlined, color: Colors.white, size: 36),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Did you know?', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                          SizedBox(height: 4),
                          Text('You can book appointments and check wait times before going to the clinic.',
                            style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.4)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) {
          setState(() => _selectedIndex = i);
          switch (i) {
            case 1: Navigator.pushNamed(context, AppRoutes.clinicDirectory); break;
            case 2: Navigator.pushNamed(context, AppRoutes.appointments); break;
            case 3: Navigator.pushNamed(context, AppRoutes.profile); break;
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.search_outlined), selectedIcon: Icon(Icons.search), label: 'Clinics'),
          NavigationDestination(icon: Icon(Icons.calendar_month_outlined), selectedIcon: Icon(Icons.calendar_month), label: 'Appointments'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _activeQueueBanner() {
    final entries = (_queueStatus!['entries'] as List<dynamic>?) ?? [];
    if (entries.isEmpty) return const SizedBox.shrink();
    final e = entries.first as Map<String, dynamic>;
    final clinic = e['clinic'] as Map<String, dynamic>? ?? {};
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRoutes.queueStatus),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.success,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            const Icon(Icons.confirmation_num_rounded, color: Colors.white, size: 32),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('You\'re in queue!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                  Text('${clinic['name'] ?? ''} — #${e['queueNumber'] ?? ''}',
                    style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  Text('~${e['estimatedWaitMinutes'] ?? 0} min wait · ${e['patientsAhead'] ?? 0} ahead',
                    style: const TextStyle(color: Colors.white70, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 16),
          ],
        ),
      ),
    );
  }

  Widget _actionCard(String label, IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 12, offset: const Offset(0, 4))]),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircleAvatar(backgroundColor: color.withOpacity(0.12), radius: 24,
              child: Icon(icon, color: color, size: 24)),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
