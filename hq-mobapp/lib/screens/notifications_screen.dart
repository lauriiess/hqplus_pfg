import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.getNotifications();
      if (mounted) setState(() { _notifs = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _notifs = []; _loading = false; });
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ApiService.markAllNotificationsRead();
      _load();
    } catch (_) {}
  }

  IconData _icon(String? type) {
    switch (type) {
      case 'queue':       return Icons.confirmation_number_outlined;
      case 'appointment': return Icons.calendar_month_outlined;
      default:            return Icons.notifications_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        title: const Text('Notifications',
            style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          if (_notifs.isNotEmpty)
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Mark all read',
                  style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _notifs.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none_rounded,
                          size: 60, color: AppColors.textMuted),
                      SizedBox(height: 12),
                      Text('No notifications',
                          style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: AppColors.textDark)),
                      Text("You're all caught up!",
                          style: TextStyle(color: AppColors.textMuted)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _notifs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final n = _notifs[i] as Map<String, dynamic>;
                      final read = n['isRead'] == true;
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: read ? Colors.white : AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: read
                                  ? AppColors.border
                                  : AppColors.primary.withOpacity(0.2)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8)),
                              child: Icon(_icon(n['type']?.toString()),
                                  color: AppColors.primary, size: 18),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(n['title']?.toString() ?? 'Notification',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.textDark,
                                          fontSize: read ? 13 : 14)),
                                  const SizedBox(height: 2),
                                  Text(n['message']?.toString() ?? '',
                                      style: const TextStyle(
                                          color: AppColors.textMuted,
                                          fontSize: 12)),
                                ],
                              ),
                            ),
                            if (!read)
                              Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle)),
                          ],
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
