import 'dart:async';
import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../services/api_service.dart';

class QueueStatusScreen extends StatefulWidget {
  const QueueStatusScreen({super.key});
  @override
  State<QueueStatusScreen> createState() => _QueueStatusScreenState();
}

class _QueueStatusScreenState extends State<QueueStatusScreen> {
  Map<String, dynamic>? _status;
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.getMyQueueStatus();
      if (mounted) {
        setState(() {
          _status = data is Map<String, dynamic> ? data : null;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cancel(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Leave Queue'),
        content: const Text('Are you sure you want to leave the queue?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Stay')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Leave',
                  style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiService.cancelQueue(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Left the queue.')));
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final entry = _status?['entry'] as Map<String, dynamic>?;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        title: const Text('Queue Status',
            style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load)
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : entry == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.inbox_outlined,
                          size: 60, color: AppColors.textMuted),
                      const SizedBox(height: 12),
                      const Text('No active queue',
                          style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: AppColors.textDark)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () =>
                            Navigator.pushNamed(context, AppRoutes.joinQueue),
                        style: ElevatedButton.styleFrom(
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12))),
                        child: const Text('Get Queue Number'),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                              colors: [AppColors.bgTop, AppColors.bgBottom]),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Column(children: [
                          const Text('Your Queue Number',
                              style: TextStyle(
                                  color: Colors.white70, fontSize: 13)),
                          const SizedBox(height: 8),
                          Text(
                              entry['ticketNumber']?.toString() ?? 'Q-000',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 48,
                                  fontWeight: FontWeight.w900)),
                          const SizedBox(height: 4),
                          Text(entry['serviceName']?.toString() ?? '',
                              style: const TextStyle(
                                  color: Colors.white70, fontSize: 14)),
                        ]),
                      ),
                      const SizedBox(height: 16),
                      Row(children: [
                        _StatCard(
                            label: 'People Ahead',
                            value: entry['peopleAhead']?.toString() ?? '0',
                            icon: Icons.people_outline,
                            color: AppColors.primary),
                        const SizedBox(width: 12),
                        _StatCard(
                            label: 'Est. Wait',
                            value:
                                '${entry['estimatedWaitTime'] ?? 0} min',
                            icon: Icons.access_time_rounded,
                            color: AppColors.orange),
                      ]),
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14)),
                        child: Row(children: [
                          const Icon(Icons.local_hospital_outlined,
                              color: AppColors.primary),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Clinic',
                                    style: TextStyle(
                                        color: AppColors.textMuted,
                                        fontSize: 12)),
                                Text(
                                    entry['clinicName']?.toString() ?? '',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.textDark)),
                              ],
                            ),
                          ),
                        ]),
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.exit_to_app_rounded,
                              color: Colors.red),
                          label: const Text('Leave Queue',
                              style: TextStyle(
                                  color: Colors.red,
                                  fontWeight: FontWeight.w800)),
                          onPressed: () {
                            final id = entry['_id']?.toString() ??
                                entry['id']?.toString() ??
                                '';
                            if (id.isNotEmpty) _cancel(id);
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.red),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _StatCard(
      {required this.label,
      required this.value,
      required this.icon,
      required this.color});
  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14)),
          child: Row(children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(width: 10),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(value,
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: color)),
              Text(label,
                  style: const TextStyle(
                      fontSize: 10, color: AppColors.textMuted)),
            ]),
          ]),
        ),
      );
}
