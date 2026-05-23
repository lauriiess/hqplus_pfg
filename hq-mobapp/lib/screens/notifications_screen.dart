import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifs = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.getNotifications();
      if (mounted) setState(() { _notifs = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ApiService.markAllNotificationsRead();
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    }
  }

  IconData _icon(String? type) {
    switch (type) {
      case 'queue':        return Icons.queue_outlined;
      case 'appointment':  return Icons.calendar_today_outlined;
      case 'system':       return Icons.info_outline;
      default:             return Icons.notifications_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = _notifs.where((n) => n['isRead'] != true).length;
    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications${unread > 0 ? ' ($unread)' : ''}'),
        backgroundColor: AppColors.primary, foregroundColor: Colors.white,
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Mark all read', style: TextStyle(color: Colors.white, fontSize: 12)),
            ),
        ],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.cloud_off_outlined, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted)),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _load, child: const Text('Retry')),
            ]))
          : _notifs.isEmpty
            ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.notifications_off_outlined, size: 56, color: Colors.grey.shade300),
                const SizedBox(height: 12),
                const Text('No notifications yet', style: TextStyle(fontSize: 15, color: AppColors.textMuted)),
              ]))
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _notifs.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final n      = _notifs[i] as Map<String, dynamic>;
                    final isRead = n['isRead'] == true;
                    return GestureDetector(
                      onTap: () async {
                        if (!isRead) {
                          await ApiService.markNotificationRead(n['_id']?.toString() ?? '').catchError((_){});
                          _load();
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isRead ? Colors.white : const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isRead ? Colors.grey.shade200 : const Color(0xFFBFDBFE)),
                        ),
                        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Container(
                            width: 38, height: 38,
                            decoration: BoxDecoration(
                              color: isRead ? Colors.grey.shade100 : const Color(0xFFDBEAFE),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(_icon(n['type']), size: 20,
                              color: isRead ? AppColors.textMuted : AppColors.primary),
                          ),
                          const SizedBox(width: 12),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(n['title']?.toString() ?? 'Notification',
                              style: TextStyle(fontWeight: isRead ? FontWeight.w500 : FontWeight.w700, fontSize: 13, color: AppColors.textDark)),
                            const SizedBox(height: 3),
                            Text(n['message']?.toString() ?? '',
                              style: const TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.4)),
                          ])),
                          if (!isRead)
                            Container(width: 8, height: 8, margin: const EdgeInsets.only(top: 4),
                              decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
                        ]),
                      ),
                    );
                  },
                ),
              ),
    );
  }
}
