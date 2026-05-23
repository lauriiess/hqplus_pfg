import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../state/app_state.dart';
import '../models/queue_models.dart';

class QueueMonitoringScreen extends StatefulWidget {
  const QueueMonitoringScreen({super.key});
  @override State<QueueMonitoringScreen> createState() => _QueueMonitoringScreenState();
}

class _QueueMonitoringScreenState extends State<QueueMonitoringScreen> {
  @override void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<AppState>().fetchQueueStatus());
  }

  @override
  Widget build(BuildContext context) {
    final queues = context.watch<AppState>().queues;
    final active = queues.where((q) => q.status == QueueStatus.waiting || q.status == QueueStatus.inProgress).toList();
    final past   = queues.where((q) => q.status == QueueStatus.completed || q.status == QueueStatus.missed).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white, foregroundColor: AppColors.textDark,
        title: const Text('My Queue', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [IconButton(
          icon: const Icon(Icons.refresh), tooltip: 'Refresh',
          onPressed: () => context.read<AppState>().fetchQueueStatus())],
      ),
      body: queues.isEmpty
        ? _EmptyQueue(onGetNumber: () => Navigator.pushNamed(context, '/join-queue'))
        : ListView(padding: const EdgeInsets.all(16), children: [
            if (active.isNotEmpty) ...[
              const Text('Active', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textDark)),
              const SizedBox(height: 10),
              ...active.map((q) => _QueueDetailCard(entry: q,
                onLeave: () => context.read<AppState>().leaveQueue(q.queueNumber))),
            ],
            if (past.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text('History', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textDark)),
              const SizedBox(height: 10),
              ...past.map((q) => _QueueDetailCard(entry: q, onLeave: null)),
            ],
          ]),
    );
  }
}

class _EmptyQueue extends StatelessWidget {
  final VoidCallback onGetNumber;
  const _EmptyQueue({required this.onGetNumber});
  @override Widget build(BuildContext context) => Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
    const Icon(Icons.confirmation_number_outlined, size: 64, color: AppColors.textMuted),
    const SizedBox(height: 16),
    const Text('No Active Queue', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textDark)),
    const SizedBox(height: 8),
    const Text('You have not joined any queue yet.', style: TextStyle(color: AppColors.textMuted)),
    const SizedBox(height: 24),
    ElevatedButton(onPressed: onGetNumber,
      style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
      child: const Text('Get Queue Number')),
  ]));
}

class _QueueDetailCard extends StatelessWidget {
  final QueueEntry entry;
  final VoidCallback? onLeave;
  const _QueueDetailCard({required this.entry, required this.onLeave});

  Color get _statusColor {
    switch (entry.status) {
      case QueueStatus.waiting:    return Colors.orange;
      case QueueStatus.inProgress: return AppColors.primary;
      case QueueStatus.completed:  return Colors.green;
      case QueueStatus.missed:     return Colors.grey;
    }
  }
  String get _statusLabel {
    switch (entry.status) {
      case QueueStatus.waiting:    return 'Waiting';
      case QueueStatus.inProgress: return 'In Progress';
      case QueueStatus.completed:  return 'Completed';
      case QueueStatus.missed:     return 'Missed';
    }
  }

  @override Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 14),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0,2))]),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(color: _statusColor.withOpacity(0.12), borderRadius: BorderRadius.circular(99)),
          child: Text(_statusLabel, style: TextStyle(color: _statusColor, fontWeight: FontWeight.w700, fontSize: 12))),
        const Spacer(),
        Text(entry.queueNumber, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.primary)),
      ]),
      const Divider(height: 20),
      Text(entry.clinicName, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark),
        maxLines: 2, overflow: TextOverflow.ellipsis),
      const SizedBox(height: 4),
      Text(entry.serviceName, style: const TextStyle(color: AppColors.textMuted)),
      const SizedBox(height: 12),
      Row(children: [
        _Stat(label: 'Position', value: '${entry.position}'),
        _Stat(label: 'Ahead', value: '${entry.totalAhead}'),
        _Stat(label: 'Est. Wait', value: '~${entry.estimatedWaitTimeMinutes}m'),
      ]),
      if (onLeave != null) ...[
        const SizedBox(height: 14),
        SizedBox(width: double.infinity, child: OutlinedButton(
          onPressed: () => showDialog(context: context, builder: (_) => AlertDialog(
            title: const Text('Leave Queue'),
            content: const Text('Are you sure you want to leave this queue?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
              TextButton(onPressed: () { Navigator.pop(context); onLeave!(); },
                child: const Text('Leave', style: TextStyle(color: Colors.red))),
            ])),
          style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
          child: const Text('Leave Queue'))),
      ],
    ]));
}

class _Stat extends StatelessWidget {
  final String label, value;
  const _Stat({required this.label, required this.value});
  @override Widget build(BuildContext context) => Expanded(child: Column(children: [
    Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.primary)),
    Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
  ]));
}
