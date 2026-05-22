import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/app_theme.dart';
import '../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _notifs = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final data = await ApiService.getNotifications();
      setState(() { _notifs = data.map((n) => n as Map<String, dynamic>).toList(); _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () async { await ApiService.markAllNotificationsRead(); _load(); },
            child: const Text('Mark all read', style: TextStyle(color: Colors.white70)),
          ),
        ],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _notifs.isEmpty
          ? const Center(child: Text('No notifications.', style: TextStyle(color: AppColors.textMuted)))
          : ListView.builder(
              itemCount: _notifs.length,
              itemBuilder: (_, i) {
                final n = _notifs[i];
                final isRead = n['isRead'] as bool? ?? false;
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isRead ? const Color(0xFFEEEEEE) : AppColors.primary.withOpacity(0.15),
                    child: Icon(
                      n['type'] == 'queue' ? Icons.confirmation_num_outlined : Icons.calendar_today_outlined,
                      color: isRead ? AppColors.textMuted : AppColors.primary, size: 20,
                    ),
                  ),
                  title: Text(n['title'] ?? '', style: TextStyle(fontWeight: isRead ? FontWeight.normal : FontWeight.w700, fontSize: 14)),
                  subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(n['message'] ?? '', style: const TextStyle(fontSize: 12)),
                    const SizedBox(height: 2),
                    Text(DateFormat('MMM d, h:mm a').format(DateTime.tryParse(n['createdAt'] ?? '') ?? DateTime.now()),
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  ]),
                  onTap: () async {
                    if (!isRead) { await ApiService.markNotificationRead(n['_id']?.toString() ?? ''); _load(); }
                  },
                );
              },
            ),
    );
  }
}
