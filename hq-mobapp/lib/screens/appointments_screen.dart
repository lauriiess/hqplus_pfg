import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/app_theme.dart';
import '../core/routes/app_routes.dart';
import '../models/appointment_model.dart';
import '../services/api_service.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});
  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  List<Appointment> _all = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  Future<void> _load() async {
    try {
      final data = await ApiService.getMyAppointments();
      setState(() {
        _all = data.map((j) => Appointment.fromJson(j as Map<String, dynamic>)).toList();
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final upcoming = _all.where((a) => a.isUpcoming).toList();
    final past     = _all.where((a) => !a.isUpcoming).toList();
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Appointments'),
        bottom: TabBar(
          controller: _tabs,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          tabs: [
            Tab(text: 'Upcoming (${upcoming.length})'),
            Tab(text: 'Past (${past.length})'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('Book'),
        onPressed: () => Navigator.pushNamed(context, AppRoutes.clinicDirectory),
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : TabBarView(
            controller: _tabs,
            children: [
              _list(upcoming, 'No upcoming appointments.'),
              _list(past, 'No past appointments.'),
            ],
          ),
    );
  }

  Widget _list(List<Appointment> items, String empty) {
    if (items.isEmpty) {
      return Center(child: Text(empty, style: const TextStyle(color: AppColors.textMuted)));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        itemBuilder: (_, i) => _card(items[i]),
      ),
    );
  }

  Widget _card(Appointment appt) {
    final statusColors = {
      'pending': AppColors.warning,
      'confirmed': AppColors.success,
      'cancelled': AppColors.error,
      'completed': AppColors.textMuted,
      'no_show': AppColors.error,
    };
    final color = statusColors[appt.status] ?? AppColors.primary;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, 4))]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(appt.clinicName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
            child: Text(appt.status.toUpperCase(), style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
          ),
        ]),
        const SizedBox(height: 4),
        Text(appt.serviceName, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
        const SizedBox(height: 8),
        Row(children: [
          const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.primary),
          const SizedBox(width: 6),
          Text(DateFormat('EEE, MMM d, yyyy').format(appt.appointmentDate),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(width: 12),
          const Icon(Icons.access_time, size: 14, color: AppColors.primary),
          const SizedBox(width: 6),
          Text(appt.timeSlot, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ]),
        if (appt.reason.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text('Reason: ${appt.reason}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
        ],
        if (appt.isUpcoming && appt.status != 'cancelled') ...[
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () => _cancelAppointment(appt),
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, side: const BorderSide(color: AppColors.error), minimumSize: const Size(0, 36)),
            child: const Text('Cancel Appointment', style: TextStyle(fontSize: 12)),
          ),
        ],
      ]),
    );
  }

  Future<void> _cancelAppointment(Appointment appt) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Appointment?'),
        content: Text('Cancel your ${appt.serviceName} at ${appt.clinicName}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Yes, Cancel')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ApiService.cancelAppointment(appt.id);
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    }
  }
}
