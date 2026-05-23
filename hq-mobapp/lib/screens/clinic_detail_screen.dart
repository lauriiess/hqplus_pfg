import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../services/api_service.dart';

class ClinicDetailScreen extends StatefulWidget {
  const ClinicDetailScreen({super.key});
  @override State<ClinicDetailScreen> createState() => _ClinicDetailScreenState();
}

class _ClinicDetailScreenState extends State<ClinicDetailScreen> {
  Map<String, dynamic>? _clinic;
  bool   _joiningQueue = false;
  String? _selectedService;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_clinic == null) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map<String, dynamic>) setState(() => _clinic = args);
    }
  }

  Future<void> _call() async {
    final phone = _clinic?['contactNumber']?.toString() ?? '';
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) launchUrl(uri);
  }

  Future<void> _joinQueue() async {
    final clinic = _clinic;
    if (clinic == null) return;
    if (_selectedService == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a service first'),
          backgroundColor: AppColors.warning));
      return;
    }
    setState(() => _joiningQueue = true);
    try {
      final id = clinic['_id']?.toString() ?? clinic['id']?.toString() ?? '';
      await ApiService.joinQueue(clinicId: id, serviceName: _selectedService!);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Joined queue successfully!'), backgroundColor: AppColors.success));
      Navigator.pushNamed(context, AppRoutes.queueStatus);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _joiningQueue = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final clinic = _clinic;
    if (clinic == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final services = List<String>.from(clinic['services'] ?? []);
    final wait = clinic['currentWaitingTime'] ?? 0;
    final queue = clinic['queueLength'] ?? 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white, foregroundColor: AppColors.textDark,
        title: Text(clinic['name'] ?? 'Clinic',
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
          maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(icon: const Icon(Icons.phone_outlined), onPressed: _call),
        ],
      ),
      body: SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Header card
          Container(padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.bgTop, AppColors.bgBottom]),
              borderRadius: BorderRadius.circular(16)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(clinic['name'] ?? '',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
              const SizedBox(height: 6),
              Row(children: [
                const Icon(Icons.location_on_outlined, color: Colors.white70, size: 14),
                const SizedBox(width: 4),
                Expanded(child: Text(clinic['address'] ?? '',
                  style: const TextStyle(color: Colors.white70, fontSize: 12))),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                _StatChip(label: '\$wait min', icon: Icons.access_time_rounded),
                const SizedBox(width: 10),
                _StatChip(label: '\$queue in queue', icon: Icons.people_outline),
              ]),
            ])),
          const SizedBox(height: 16),

          // Services
          const Text('Select a Service',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textDark)),
          const SizedBox(height: 10),
          ...services.map((s) {
            final sel = s == _selectedService;
            return GestureDetector(
              onTap: () => setState(() => _selectedService = s),
              child: AnimatedContainer(duration: const Duration(milliseconds: 150),
                margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: sel ? AppColors.primary : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: 2)),
                child: Row(children: [
                  Icon(Icons.medical_services_outlined,
                    color: sel ? Colors.white : AppColors.primary),
                  const SizedBox(width: 12),
                  Text(s, style: TextStyle(fontWeight: FontWeight.w700,
                    color: sel ? Colors.white : AppColors.textDark)),
                  const Spacer(),
                  if (sel) const Icon(Icons.check_circle, color: Colors.white, size: 20),
                ])));
          }),

          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: ElevatedButton.icon(
              icon: const Icon(Icons.confirmation_number_outlined),
              label: _joiningQueue
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Join Queue'),
              onPressed: _joiningQueue ? null : _joinQueue,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))))),
            const SizedBox(width: 10),
            Expanded(child: OutlinedButton.icon(
              icon: const Icon(Icons.calendar_month_outlined),
              label: const Text('Book Appt'),
              onPressed: () => Navigator.pushNamed(context, AppRoutes.bookAppointment),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary, side: const BorderSide(color: AppColors.primary),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))))),
          ]),
        ])),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final IconData icon;
  const _StatChip({required this.label, required this.icon});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(99)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, color: Colors.white, size: 14),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
    ]));
}
