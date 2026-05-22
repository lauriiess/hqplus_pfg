import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/routes/app_routes.dart';
import '../models/clinic_model.dart';
import '../services/api_service.dart';

class ClinicDetailScreen extends StatelessWidget {
  const ClinicDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final clinic = ModalRoute.of(context)!.settings.arguments as Clinic;

    return Scaffold(
      appBar: AppBar(title: Text(clinic.name)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.bgTop, AppColors.bgBottom]),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    const CircleAvatar(backgroundColor: Colors.white, radius: 28,
                      child: Icon(Icons.local_hospital_rounded, color: AppColors.primary, size: 28)),
                    const SizedBox(width: 16),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(clinic.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
                      const SizedBox(height: 4),
                      Text(clinic.city, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                    ])),
                  ]),
                  const SizedBox(height: 16),
                  _infoRow(Icons.location_on_outlined, clinic.address),
                  const SizedBox(height: 6),
                  _infoRow(Icons.access_time, clinic.operatingHours),
                  const SizedBox(height: 6),
                  if (clinic.contactNumber.isNotEmpty) _infoRow(Icons.phone_outlined, clinic.contactNumber),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Live stats
            Row(children: [
              _statCard('Queue', '${clinic.activeQueueCount}', 'active patients', AppColors.primary),
              const SizedBox(width: 12),
              _statCard('Wait', '~${clinic.estimatedWaitMinutes}m', 'estimated', AppColors.secondary),
            ]),
            const SizedBox(height: 20),

            // Services
            const Text('Services', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            ...clinic.services.where((s) => s.isAvailable).map((s) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFEEEEEE)),
              ),
              child: Row(children: [
                const Icon(Icons.medical_services_outlined, color: AppColors.primary, size: 20),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(s.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  if (s.description.isNotEmpty)
                    Text(s.description, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                ])),
                Text('${s.durationMinutes}min', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ]),
            )),
            const SizedBox(height: 24),

            // Action buttons
            if (clinic.acceptsWalkIn)
              ElevatedButton.icon(
                icon: const Icon(Icons.directions_walk),
                label: const Text('Join Walk-in Queue'),
                onPressed: () => _showJoinQueueDialog(context, clinic),
              ),
            const SizedBox(height: 12),
            if (clinic.acceptsAppointment)
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_today),
                label: const Text('Book Appointment'),
                onPressed: () => Navigator.pushNamed(context, AppRoutes.bookAppointment, arguments: clinic),
              ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(children: [
      Icon(icon, color: Colors.white70, size: 16),
      const SizedBox(width: 8),
      Expanded(child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 13))),
    ]);
  }

  Widget _statCard(String title, String value, String sub, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(color: color, fontSize: 24, fontWeight: FontWeight.w800)),
          Text(sub, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        ]),
      ),
    );
  }

  void _showJoinQueueDialog(BuildContext context, Clinic clinic) {
    ClinicService? selected;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Select Service', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              ...clinic.services.where((s) => s.isAvailable).map((s) => RadioListTile<ClinicService>(
                value: s, groupValue: selected, title: Text(s.name),
                subtitle: Text('~${s.durationMinutes}min'),
                activeColor: AppColors.primary,
                onChanged: (v) => setS(() => selected = v),
              )),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: selected == null ? null : () async {
                  Navigator.pop(ctx);
                  await _joinQueue(context, clinic, selected!);
                },
                child: const Text('Join Queue'),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _joinQueue(BuildContext context, Clinic clinic, ClinicService service) async {
    try {
      final result = await ApiService.joinQueue(
        clinicId: clinic.id,
        serviceName: service.name,
        serviceId: service.id,
      );
      if (context.mounted) {
        Navigator.pushNamed(context, AppRoutes.queueStatus);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Joined! Your number: ${result['queueNumber']}'),
          backgroundColor: AppColors.success,
        ));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
      }
    }
  }
}
