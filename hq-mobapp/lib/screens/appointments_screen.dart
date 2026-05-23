import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';
import '../models/appointment_models.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});
  @override State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;

  bool _fetched = false;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback(
        (_) => context.read<AppState>().fetchAppointments());
  }

  // Re-fetch every time this screen becomes visible (e.g. after booking)
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_fetched) {
      context.read<AppState>().fetchAppointments();
    }
    _fetched = true;
  }

  @override void dispose() { _tab.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final upcoming = appState.upcomingAppointments;
    final past     = appState.pastAppointments;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        title: const Text('Appointments', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => Navigator.pushNamed(context, AppRoutes.bookAppointment)),
        ],
        bottom: TabBar(
          controller: _tab,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.primary,
          tabs: [
            Tab(text: 'Upcoming (${upcoming.length})'),
            Tab(text: 'Past (${past.length})'),
          ],
        ),
      ),
      body: TabBarView(controller: _tab, children: [
        _AppointmentList(
          appointments: upcoming,
          onCancel: (id) => context.read<AppState>().cancelAppointment(id),
        ),
        _AppointmentList(appointments: past, onCancel: null),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
class _AppointmentList extends StatelessWidget {
  final List<Appointment> appointments;
  final void Function(String)? onCancel;
  const _AppointmentList({required this.appointments, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    if (appointments.isEmpty) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.event_busy_outlined, size: 60, color: AppColors.textMuted),
        const SizedBox(height: 14),
        const Text('No appointments',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textDark)),
        const SizedBox(height: 6),
        const Text('Your appointments will appear here.',
            style: TextStyle(color: AppColors.textMuted)),
        if (onCancel != null) ...[
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, AppRoutes.bookAppointment),
            style: ElevatedButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('Book an Appointment')),
        ],
      ]));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: appointments.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _AppointmentCard(appt: appointments[i], onCancel: onCancel),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
class _AppointmentCard extends StatelessWidget {
  final Appointment appt;
  final void Function(String)? onCancel;
  const _AppointmentCard({required this.appt, required this.onCancel});

  // Use pending/confirmed/arrived/serving/completed/noShow/cancelled/rescheduled
  Color get _statusColor {
    switch (appt.status) {
      case AppointmentStatus.pending:      return AppColors.primary;
      case AppointmentStatus.confirmed:    return Colors.green;
      case AppointmentStatus.arrived:      return Colors.teal;
      case AppointmentStatus.serving:      return Colors.orange;
      case AppointmentStatus.completed:    return Colors.grey;
      case AppointmentStatus.noShow:       return Colors.deepOrange;
      case AppointmentStatus.cancelled:    return Colors.red;
      case AppointmentStatus.rescheduled:  return Colors.purple;
    }
  }

  String get _statusLabel {
    switch (appt.status) {
      case AppointmentStatus.pending:      return 'Pending';
      case AppointmentStatus.confirmed:    return 'Confirmed';
      case AppointmentStatus.arrived:      return 'Arrived';
      case AppointmentStatus.serving:      return 'In Progress';
      case AppointmentStatus.completed:    return 'Completed';
      case AppointmentStatus.noShow:       return 'No Show';
      case AppointmentStatus.cancelled:    return 'Cancelled';
      case AppointmentStatus.rescheduled:  return 'Rescheduled';
    }
  }

  IconData get _statusIcon {
    switch (appt.status) {
      case AppointmentStatus.pending:      return Icons.schedule_outlined;
      case AppointmentStatus.confirmed:    return Icons.check_circle_outline;
      case AppointmentStatus.arrived:      return Icons.directions_walk_outlined;
      case AppointmentStatus.serving:      return Icons.timelapse_outlined;
      case AppointmentStatus.completed:    return Icons.task_alt_outlined;
      case AppointmentStatus.noShow:       return Icons.person_off_outlined;
      case AppointmentStatus.cancelled:    return Icons.cancel_outlined;
      case AppointmentStatus.rescheduled:  return Icons.event_repeat_outlined;
    }
  }

  bool get _canCancel =>
      appt.status == AppointmentStatus.pending ||
      appt.status == AppointmentStatus.confirmed;

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('MMM d, yyyy');
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2))
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Status header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: _statusColor.withOpacity(0.08),
            borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16), topRight: Radius.circular(16)),
          ),
          child: Row(children: [
            Icon(_statusIcon, color: _statusColor, size: 16),
            const SizedBox(width: 6),
            Text(_statusLabel,
                style: TextStyle(color: _statusColor, fontWeight: FontWeight.w700, fontSize: 12)),
            const Spacer(),
            Text(fmt.format(appt.date),
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          ]),
        ),
        // Body
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(appt.clinicName,
                style: const TextStyle(
                    fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.textDark),
                maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.medical_services_outlined, size: 14, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Expanded(child: Text(appt.serviceName,
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 13))),
            ]),
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.access_time_rounded, size: 14, color: AppColors.textMuted),
              const SizedBox(width: 4),
              Text(appt.timeLabel,
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ]),
            if (appt.clinicAddress.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Expanded(child: Text(appt.clinicAddress,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                    maxLines: 2)),
              ]),
            ],
            if (appt.notes.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                    color: AppColors.fieldFill, borderRadius: BorderRadius.circular(8)),
                child: Text(appt.notes,
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted))),
            ],
            if (onCancel != null && _canCancel) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => showDialog(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('Cancel Appointment'),
                      content: const Text('Are you sure you want to cancel this appointment?'),
                      actions: [
                        TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Keep It')),
                        TextButton(
                            onPressed: () {
                              Navigator.pop(context);
                              onCancel!(appt.id);
                            },
                            child: const Text('Cancel',
                                style: TextStyle(color: Colors.red))),
                      ],
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Cancel Appointment'),
                ),
              ),
            ],
          ]),
        ),
      ]),
    );
  }
}
