import 'package:flutter/material.dart';
import '../core/routes/app_routes.dart';
import '../core/theme/app_theme.dart';
import '../services/api_service.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});
  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  List<dynamic> _all = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _tab = TabController(length: 3, vsync: this); _load(); }

  @override
  void dispose() { _tab.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.getMyAppointments();
      if (mounted) setState(() { _all = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _cancel(dynamic appt) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel Appointment'),
        content: const Text('Are you sure you want to cancel this appointment?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
          TextButton(onPressed: () => Navigator.pop(context, true),  child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ApiService.cancelAppointment(appt['_id']?.toString() ?? '');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Appointment cancelled')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    }
  }

  List<dynamic> _filter(String status) {
    if (status == 'upcoming') return _all.where((a) => ['pending','confirmed'].contains(a['status'])).toList();
    if (status == 'past')     return _all.where((a) => ['completed','no_show'].contains(a['status'])).toList();
    return _all.where((a) => a['status'] == 'cancelled').toList();
  }

  Color _statusColor(String? s) {
    switch(s) {
      case 'confirmed':  return AppColors.success;
      case 'pending':    return AppColors.warning;
      case 'completed':  return AppColors.primary;
      case 'cancelled':  return Colors.red;
      default:           return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Appointments'),
        backgroundColor: AppColors.primary, foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: () => Navigator.pushNamed(context, AppRoutes.clinicDirectory)),
        ],
        bottom: TabBar(
          controller: _tab,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          tabs: const [Tab(text: 'Upcoming'), Tab(text: 'Past'), Tab(text: 'Cancelled')],
        ),
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _load, child: const Text('Retry')),
            ]))
          : TabBarView(controller: _tab, children: [
              _ApptList(items: _filter('upcoming'), onCancel: _cancel, statusColor: _statusColor, onRefresh: _load, emptyMsg: 'No upcoming appointments'),
              _ApptList(items: _filter('past'),     onCancel: null,    statusColor: _statusColor, onRefresh: _load, emptyMsg: 'No past appointments'),
              _ApptList(items: _filter('cancelled'),onCancel: null,    statusColor: _statusColor, onRefresh: _load, emptyMsg: 'No cancelled appointments'),
            ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, AppRoutes.clinicDirectory),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Book', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
    );
  }
}

class _ApptList extends StatelessWidget {
  final List<dynamic> items;
  final Future<void> Function(dynamic)? onCancel;
  final Color Function(String?) statusColor;
  final Future<void> Function() onRefresh;
  final String emptyMsg;
  const _ApptList({required this.items, required this.onCancel, required this.statusColor, required this.onRefresh, required this.emptyMsg});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(Icons.calendar_today_outlined, size: 52, color: Colors.grey.shade300),
      const SizedBox(height: 12),
      Text(emptyMsg, style: const TextStyle(color: AppColors.textMuted, fontSize: 15)),
    ]));
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final a      = items[i] as Map<String, dynamic>;
          final status = a['status']?.toString() ?? '';
          final date   = a['appointmentDate']?.toString().split('T').first ?? '—';
          final time   = a['timeSlot']?.toString() ?? '—';
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0,2))]),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(a['serviceName']?.toString() ?? 'Appointment',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textDark))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: statusColor(status).withOpacity(0.1), borderRadius: BorderRadius.circular(99)),
                  child: Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: statusColor(status))),
                ),
              ]),
              const SizedBox(height: 8),
              Text(a['clinic'] != null ? (a['clinic']['name'] ?? '') : '',
                style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
              const SizedBox(height: 6),
              Row(children: [
                const Icon(Icons.calendar_today_outlined, size: 13, color: AppColors.textMuted),
                const SizedBox(width: 5),
                Text('$date  •  $time', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ]),
              if (onCancel != null) ...[
                const SizedBox(height: 12),
                SizedBox(width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => onCancel!(a),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red), minimumSize: const Size.fromHeight(38)),
                    child: const Text('Cancel Appointment'),
                  ),
                ),
              ],
            ]),
          );
        },
      ),
    );
  }
}
