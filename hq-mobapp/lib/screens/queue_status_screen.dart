import 'dart:async';
import 'package:flutter/material.dart';
import '../core/routes/app_routes.dart';
import '../core/theme/app_theme.dart';
import '../services/api_service.dart';

class QueueStatusScreen extends StatefulWidget {
  const QueueStatusScreen({super.key});
  @override
  State<QueueStatusScreen> createState() => _QueueStatusScreenState();
}

class _QueueStatusScreenState extends State<QueueStatusScreen> {
  Map<String, dynamic>? _status;
  bool    _loading = true;
  String? _error;
  Timer?  _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _load());
  }

  @override
  void dispose() { _timer?.cancel(); super.dispose(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.getMyQueueStatus();
      if (mounted) setState(() { _status = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _cancel(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Leave Queue?'),
        content: const Text('Are you sure you want to cancel your spot in this queue?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Yes, Leave'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ApiService.cancelQueueEntry(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('You have left the queue.'), backgroundColor: AppColors.success));
        _load();
      }
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
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
          ? _ErrorView(message: _error!, onRetry: _load)
          : RefreshIndicator(
              onRefresh: _load,
              child: _status == null || _status!['active'] != true
                ? _EmptyView(onFindClinic: () => Navigator.pushNamed(context, AppRoutes.clinicDirectory))
                : _ActiveQueueView(status: _status!, onCancel: _cancel),
            ),
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _ActiveQueueView extends StatelessWidget {
  final Map<String, dynamic> status;
  final Future<void> Function(String) onCancel;
  const _ActiveQueueView({required this.status, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    final entry        = status['entry'] as Map<String, dynamic>? ?? {};
    final clinic       = entry['clinic'] as Map<String, dynamic>? ?? {};
    final qNum         = entry['queueNumber']?.toString() ?? 'Q—';
    final svc          = entry['serviceName']?.toString() ?? '';
    final entryStatus  = entry['status']?.toString() ?? 'waiting';
    final ahead        = status['ahead'] ?? 0;
    final wait         = status['estimatedWait'] ?? 0;
    final isServing    = entryStatus == 'serving';
    final statusColor  = isServing ? AppColors.success : AppColors.primary;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Main queue card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isServing
                ? [const Color(0xFF166534), const Color(0xFF16A34A)]
                : [AppColors.bgTop, AppColors.bgBottom],
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: statusColor.withOpacity(0.3), blurRadius: 20, offset: const Offset(0,8))],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.confirmation_num_outlined, color: Colors.white70, size: 16),
              const SizedBox(width: 6),
              Text(clinic['name']?.toString() ?? 'Clinic',
                style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(99)),
                child: Text(isServing ? "YOUR TURN!" : 'WAITING',
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
              ),
            ]),
            const SizedBox(height: 20),
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(qNum, style: const TextStyle(fontSize: 56, fontWeight: FontWeight.w900, color: Colors.white, height: 1)),
              const Spacer(),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('$ahead ahead', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                Text('~$wait min wait', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13)),
              ]),
            ]),
            const SizedBox(height: 14),
            Container(height: 1, color: Colors.white24),
            const SizedBox(height: 14),
            Text('Service: $svc', style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13)),
          ]),
        ),
        const SizedBox(height: 20),

        // Tips card
        if (!isServing) Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFFED7AA))),
          child: const Row(children: [
            Icon(Icons.notifications_active_outlined, color: Color(0xFFD97706), size: 20),
            SizedBox(width: 10),
            Expanded(child: Text('Stay nearby! You will be called when it is your turn.',
              style: TextStyle(fontSize: 12, color: Color(0xFF92400E), height: 1.4))),
          ]),
        ),
        if (isServing) Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBBF7D0))),
          child: const Row(children: [
            Icon(Icons.check_circle_outline, color: Color(0xFF16A34A), size: 20),
            SizedBox(width: 10),
            Expanded(child: Text('Please proceed to the clinic window now!',
              style: TextStyle(fontSize: 13, color: Color(0xFF166534), fontWeight: FontWeight.w600))),
          ]),
        ),
        const SizedBox(height: 20),

        // Leave button
        if (!isServing) OutlinedButton.icon(
          onPressed: () => onCancel(entry['_id']?.toString() ?? ''),
          icon: const Icon(Icons.exit_to_app_outlined, color: Colors.red),
          label: const Text('Leave Queue', style: TextStyle(color: Colors.red)),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: Colors.red),
            minimumSize: const Size.fromHeight(48),
          ),
        ),
      ],
    );
  }
}

class _EmptyView extends StatelessWidget {
  final VoidCallback onFindClinic;
  const _EmptyView({required this.onFindClinic});
  @override
  Widget build(BuildContext context) => ListView(children: [
    const SizedBox(height: 60),
    Center(child: Column(children: [
      Container(width: 90, height: 90,
        decoration: BoxDecoration(color: const Color(0xFFEFF6FF), shape: BoxShape.circle),
        child: const Icon(Icons.confirmation_num_outlined, size: 44, color: AppColors.primary)),
      const SizedBox(height: 20),
      const Text("You're not in any queue", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textDark)),
      const SizedBox(height: 8),
      const Text('Find a clinic to join a walk-in queue',
        style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
      const SizedBox(height: 28),
      ElevatedButton.icon(
        onPressed: onFindClinic,
        icon: const Icon(Icons.search),
        label: const Text('Find a Clinic'),
        style: ElevatedButton.styleFrom(minimumSize: const Size(200, 48)),
      ),
    ])),
  ]);
}

class _ErrorView extends StatelessWidget {
  final String message; final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(32),
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(Icons.cloud_off_outlined, size: 56, color: Colors.grey.shade300),
      const SizedBox(height: 16),
      Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
      const SizedBox(height: 20),
      ElevatedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Retry')),
    ]),
  ));
}
