import 'dart:math';
import 'dart:async';
import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../models/queue_models.dart';
import '../services/api_service.dart';

class QueueMonitoringScreen extends StatefulWidget {
  const QueueMonitoringScreen({super.key});

  @override
  State<QueueMonitoringScreen> createState() => _QueueMonitoringScreenState();
}

class _QueueMonitoringScreenState extends State<QueueMonitoringScreen> {
  Timer? _timer;
  Map<String, dynamic>? _queueStatus;
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _fetchStatus();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _fetchStatus());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetchStatus() async {
    try {
      final res = await ApiService.getMyQueueStatus();
      if (mounted) {
        setState(() {
          _queueStatus = res;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _addQueue() async {
    await Navigator.pushNamed(context, AppRoutes.joinQueue);
    if (!mounted) return;
    setState(() => _isLoading = true);
    _fetchStatus();
  }

  Future<void> _leaveSelectedQueue(String id) async {
    try {
      await ApiService.cancelQueue(id);
      if (mounted) {
        setState(() => _isLoading = true);
        _fetchStatus();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error leaving queue: ${e}')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        titleSpacing: 16,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Queue Status", style: TextStyle(fontWeight: FontWeight.w900)),
            SizedBox(height: 2),
            Text(
              "Real-time updates on your position",
              style: TextStyle(
                fontSize: 12.5,
                color: AppColors.textMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppColors.border),
        ),
      ),
      body: SafeArea(
        child: _buildBody(),
      ),
      bottomNavigationBar: const _BottomNavMock(selectedIndex: 3),
    );
  }

  Widget _buildBody() {
    if (_isLoading && _queueStatus == null) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_error.isNotEmpty && _queueStatus == null) {
      return Center(child: Text('Error: ${_error}'));
    }
    
    final active = _queueStatus?['active'] == true;
    if (!active || _queueStatus?['entry'] == null) {
      return _EmptyQueues(addQueue: _addQueue);
    }
    
    final entry = _queueStatus!['entry'];
    
    final q = QueueEntry(
      id: entry['_id']?.toString() ?? '',
      queueNumber: entry['ticketNumber']?.toString() ?? '',
      queueType: QueueType.regular,
      departmentId: entry['serviceId']?.toString() ?? '',
      departmentName: entry['serviceName']?.toString() ?? 'Service',
      serviceId: entry['serviceId']?.toString() ?? '',
      serviceName: entry['serviceName']?.toString() ?? 'Service',
      doctorId: '',
      doctorName: entry['clinic'] == null ? 'Clinic' : (entry['clinic']['name']?.toString() ?? 'Clinic'),
      joinedAt: DateTime.tryParse(entry['joinedAt']?.toString() ?? '') ?? DateTime.now(),
      position: (entry['peopleAhead'] ?? 0) as int,
      totalAhead: (entry['peopleAhead'] ?? 0) as int,
      estimatedWaitTimeMinutes: (entry['peopleAhead'] ?? 0) * 10,
      status: QueueStatus.waiting,
    );

    return _QueueStatusView(
      onLeaveQueue: () => _leaveSelectedQueue(q.id ?? ''),
      q: q,
    );
  }
}

class _EmptyQueues extends StatelessWidget {
  final VoidCallback addQueue;
  const _EmptyQueues({required this.addQueue});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 14,
              offset: const Offset(0, 8),
            )
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.confirmation_number_outlined,
                size: 54, color: AppColors.textMuted),
            const SizedBox(height: 12),
            const Text(
              "No Active Queue",
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textDark),
            ),
            const SizedBox(height: 8),
            const Text(
              "Join a department queue to receive real-time updates.",
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, height: 1.35),
            ),
            const SizedBox(height: 14),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: addQueue,
              icon: const Icon(Icons.add),
              label: const Text("Join Queue",
                  style: TextStyle(fontWeight: FontWeight.w900)),
            ),
          ],
        ),
      ),
    );
  }
}

class _QueueStatusView extends StatelessWidget {
  final VoidCallback onLeaveQueue;
  final QueueEntry q;

  const _QueueStatusView({
    required this.onLeaveQueue,
    required this.q,
  });

  @override
  Widget build(BuildContext context) {
    final cardBlue = AppColors.primary;

    final waitMin = max(1, q.estimatedWaitTimeMinutes - 2);
    final waitMax = q.estimatedWaitTimeMinutes + 3;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardBlue,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 18,
                  offset: const Offset(0, 10),
                )
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.bolt, color: Colors.white, size: 18),
                    SizedBox(width: 8),
                    Text("Your Current Queue",
                        style: TextStyle(
                            color: Colors.white, fontWeight: FontWeight.w900)),
                  ],
                ),
                const SizedBox(height: 10),
                Center(
                  child: Text(
                    q.queueNumber,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 56,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                    ),
                  ),
                ),
                Center(
                  child: Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      q.departmentName.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                )
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _InfoBox(
                  label: "People Ahead",
                  value: "${q.totalAhead}",
                  icon: Icons.people_alt,
                  valueColor: Colors.red,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _InfoBox(
                  label: "Est. Time",
                  value: "${waitMin}-${waitMax} m",
                  icon: Icons.access_time_filled,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red, width: 2),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () => _confirmLeave(context, q),
              icon: const Icon(Icons.exit_to_app),
              label: const Text("Leave Queue", style: TextStyle(fontWeight: FontWeight.w900)),
            ),
          )
        ],
      ),
    );
  }

  Future<void> _confirmLeave(BuildContext context, QueueEntry q) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Leave Queue?", style: TextStyle(fontWeight: FontWeight.w900)),
        content: Text("Are you sure you want to leave queue ${q.queueNumber}? This action cannot be undone."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text("Leave"),
          )
        ],
      ),
    );
    if (res == true) {
      onLeaveQueue();
    }
  }
}

class _InfoBox extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color valueColor;

  const _InfoBox({
    required this.label,
    required this.value,
    required this.icon,
    this.valueColor = AppColors.textDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.textMuted, size: 24),
          const SizedBox(height: 10),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: valueColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomNavMock extends StatelessWidget {
  final int selectedIndex;
  const _BottomNavMock({required this.selectedIndex});

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: selectedIndex,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: AppColors.textMuted,
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
      selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
      unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
      onTap: (i) {
        if (i == 0) Navigator.pushReplacementNamed(context, AppRoutes.dashboard);
        if (i == 1) Navigator.pushReplacementNamed(context, AppRoutes.appointments);
        if (i == 2) Navigator.pushReplacementNamed(context, AppRoutes.chatBot);
      },
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: "Home"),
        BottomNavigationBarItem(icon: Icon(Icons.calendar_today_outlined), activeIcon: Icon(Icons.calendar_today), label: "Appts"),
        BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), activeIcon: Icon(Icons.chat_bubble), label: "Chat"),
        BottomNavigationBarItem(icon: Icon(Icons.confirmation_number_outlined), activeIcon: Icon(Icons.confirmation_number), label: "Queue"),
        BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: "Profile"),
      ],
    );
  }
}
