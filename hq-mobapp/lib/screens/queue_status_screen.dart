import 'dart:async';
import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
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
    // Auto-refresh every 30 seconds
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.getMyQueueStatus();
      if (mounted) setState(() { _status = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cancel(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Queue?'),
        content: const Text('Are you sure you want to leave this queue?'),
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
      await ApiService.cancelQueueEntry(id);
      _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Queue entry cancelled.'), backgroundColor: AppColors.success));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Queue Status'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: _status == null || _status!['active'] == false
              ? _emptyState()
              : _queueList(),
          ),
    );
  }

  Widget _emptyState() {
    return ListView(children: [
      const SizedBox(height: 80),
      const Center(
        child: Column(children: [
          Icon(Icons.confirmation_num_outlined, size: 72, color: AppColors.textMuted),
          SizedBox(height: 16),
          Text("You're not in any queue right now.",
            style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
          SizedBox(height: 8),
          Text('Go to Clinic Directory to join a walk-in queue.',
            style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
        ]),
      ),
    ]);
  }

  Widget _queueList() {
    final entries = (_status!['entries'] as List<dynamic>?) ?? [];
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: entries.length,
      itemBuilder: (_, i) => _queueCard(entries[i] as Map<String, dynamic>),
    );
  }

  Widget _queueCard(Map<String, dynamic> entry) {
    final clinic = entry['clinic'] as Map<String, dynamic>? ?? {};
    final status = entry['status'] as String? ?? 'waiting';
    final statusColor = status == 'serving' ? AppColors.success : AppColors.primary;
    final statusLabel = status == 'serving' ? "It's your turn!" : 'Waiting';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.07), blurRadius: 12, offset: const Offset(0, 4))]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: statusColor.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
              child: Text(entry['queueNumber'] ?? '—',
                style: TextStyle(color: statusColor, fontWeight: FontWeight.w800, fontSize: 22)),
            ),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(clinic['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              Text(entry['serviceName'] ?? '', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
              child: Text(statusLabel, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 16),
          Row(children: [
            _miniStat('Patients Ahead', '${entry['patientsAhead'] ?? 0}'),
            const SizedBox(width: 16),
            _miniStat('Est. Wait', '~${entry['estimatedWaitMinutes'] ?? 0}m'),
          ]),
          if (status == 'waiting') ...[
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () => _cancel(entry['_id']?.toString() ?? ''),
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, side: const BorderSide(color: AppColors.error)),
              child: const Text('Leave Queue'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
      Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: AppColors.textDark)),
    ]);
  }
}
