import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/routes/app_routes.dart';
import '../models/clinic_model.dart';
import '../services/api_service.dart';

class ClinicDirectoryScreen extends StatefulWidget {
  const ClinicDirectoryScreen({super.key});
  @override
  State<ClinicDirectoryScreen> createState() => _ClinicDirectoryScreenState();
}

class _ClinicDirectoryScreenState extends State<ClinicDirectoryScreen> {
  List<Clinic> _clinics = [];
  List<Clinic> _filtered = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.getClinicDirectory();
      final list = data.map((j) => Clinic.fromJson(j as Map<String, dynamic>)).toList();
      setState(() { _clinics = list; _filtered = list; _loading = false; });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
      }
    }
  }

  void _filter(String q) {
    setState(() {
      _search = q;
      _filtered = _clinics.where((c) =>
        c.name.toLowerCase().contains(q.toLowerCase()) ||
        c.city.toLowerCase().contains(q.toLowerCase()) ||
        c.services.any((s) => s.name.toLowerCase().contains(q.toLowerCase()))
      ).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Clinic Directory')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: _filter,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search by clinic name or service...',
              ),
            ),
          ),
          Expanded(
            child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _filtered.isEmpty
                ? const Center(child: Text('No clinics found.', style: TextStyle(color: AppColors.textMuted)))
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _filtered.length,
                      itemBuilder: (_, i) => _clinicCard(_filtered[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _clinicCard(Clinic clinic) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRoutes.clinicDetail, arguments: clinic),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const CircleAvatar(backgroundColor: Color(0xFFE3F2FD), radius: 22,
                  child: Icon(Icons.local_hospital_outlined, color: AppColors.primary, size: 22)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(clinic.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    Text('${clinic.city} · ${clinic.operatingHours}',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  ]),
                ),
                _statusChip(clinic.activeQueueCount, clinic.estimatedWaitMinutes),
              ],
            ),
            const SizedBox(height: 12),
            Row(children: [
              if (clinic.acceptsWalkIn) _badge('Walk-in', Icons.directions_walk, AppColors.secondary),
              if (clinic.acceptsWalkIn && clinic.acceptsAppointment) const SizedBox(width: 8),
              if (clinic.acceptsAppointment) _badge('Appointment', Icons.calendar_today, AppColors.primary),
            ]),
            if (clinic.services.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(clinic.services.map((s) => s.name).take(3).join(' · '),
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _statusChip(int count, int wait) {
    final color = count < 10 ? AppColors.success : (count < 25 ? AppColors.warning : AppColors.error);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
      child: Text('~${wait}m wait', style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }

  Widget _badge(String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
      ]),
    );
  }
}
