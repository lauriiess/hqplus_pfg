import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../core/routes/app_routes.dart';
import '../core/constants/app_colors.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _queueStatus;
  bool _loading = true;
  String? _error;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.getMyQueueStatus();
      if (mounted) setState(() { _queueStatus = data is Map<String, dynamic> ? data : null; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user  = context.watch<AppState>().currentUser;
    final entry = _queueStatus?['entry'] as Map<String, dynamic>?;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Hi, \${user?.fullName.split(' ').first ?? 'Patient'} 👋',
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.textDark)),
          const Text('How can we help you today?',
            style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.notifications_none_rounded),
            onPressed: () => Navigator.pushNamed(context, AppRoutes.notifications)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          // Queue status card
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
          else if (entry != null)
            _ActiveQueueCard(entry: entry)
          else
            _NoQueueCard(),
          const SizedBox(height: 16),
          // Quick actions
          const Text('Quick Actions',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textDark)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _ActionBtn(icon: Icons.calendar_month_outlined,
              label: 'Book Appointment', color: AppColors.primary,
              onTap: () => Navigator.pushNamed(context, AppRoutes.bookAppointment))),
            const SizedBox(width: 10),
            Expanded(child: _ActionBtn(icon: Icons.confirmation_number_outlined,
              label: 'Get Queue Number', color: AppColors.orange,
              onTap: () => Navigator.pushNamed(context, AppRoutes.joinQueue))),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _ActionBtn(icon: Icons.local_hospital_outlined,
              label: 'Find Clinics', color: AppColors.success,
              onTap: () => Navigator.pushNamed(context, AppRoutes.clinicDirectory))),
            const SizedBox(width: 10),
            Expanded(child: _ActionBtn(icon: Icons.smart_toy_outlined,
              label: 'AI Assistant', color: AppColors.primaryDark,
              onTap: () => Navigator.pushNamed(context, AppRoutes.chatBot))),
          ]),
        ]),
      ),
    );
  }
}

class _ActiveQueueCard extends StatelessWidget {
  final Map<String, dynamic> entry;
  const _ActiveQueueCard({required this.entry});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      gradient: const LinearGradient(colors: [AppColors.bgTop, AppColors.bgBottom]),
      borderRadius: BorderRadius.circular(16)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(children: [
        Icon(Icons.confirmation_number_rounded, color: Colors.white),
        SizedBox(width: 8),
        Text('Active Queue', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
      ]),
      const SizedBox(height: 10),
      Text(entry['ticketNumber']?.toString() ?? '—',
        style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
      Text(entry['serviceName']?.toString() ?? '',
        style: const TextStyle(color: Colors.white70)),
      const SizedBox(height: 10),
      Row(children: [
        _Stat(label: 'Ahead', value: entry['peopleAhead']?.toString() ?? '0'),
        _Stat(label: 'Est. Wait', value: '\${entry['estimatedWaitTime'] ?? 0}m'),
      ]),
      const SizedBox(height: 12),
      SizedBox(width: double.infinity, child: OutlinedButton(
        onPressed: () => Navigator.pushNamed(context, AppRoutes.queueStatus),
        style: OutlinedButton.styleFrom(foregroundColor: Colors.white,
          side: const BorderSide(color: Colors.white54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
        child: const Text('View Details'))),
    ]));
}

class _Stat extends StatelessWidget {
  final String label, value;
  const _Stat({required this.label, required this.value});
  @override Widget build(BuildContext context) => Expanded(child: Column(children: [
    Text(value, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
    Text(label, style: const TextStyle(color: Colors.white60, fontSize: 12)),
  ]));
}

class _NoQueueCard extends StatelessWidget {
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border)),
    child: const Row(children: [
      Icon(Icons.inbox_outlined, color: AppColors.textMuted, size: 32),
      SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('No active queue', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark)),
        Text('Join a queue or book an appointment to get started.',
          style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
      ])),
    ]));
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ActionBtn({required this.icon, required this.label, required this.color, required this.onTap});
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6)]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 36, height: 36,
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: color, size: 20)),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.textDark)),
      ])));
}
