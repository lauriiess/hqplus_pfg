import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';
import '../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _profile;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final data = await ApiService.getMyPatientProfile();
      if (mounted) setState(() { _profile = data; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().currentUser;
    return Scaffold(
      appBar: AppBar(title: const Text('My Profile')),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Avatar
                const CircleAvatar(radius: 44, backgroundColor: AppColors.primary,
                  child: Icon(Icons.person, color: Colors.white, size: 44)),
                const SizedBox(height: 12),
                Text(user?.fullName ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                Text(user?.email ?? '', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                const SizedBox(height: 24),

                // Profile fields
                _infoCard([
                  _row('Phone', _profile?['phone'] ?? user?.phone ?? '—'),
                  _row('Patient Type', _profile?['patientType'] ?? 'Regular'),
                  _row('PhilHealth No.', _profile?['philHealthNumber'] ?? '—'),
                  _row('HMO Provider', _profile?['hmoProvider'] ?? '—'),
                  _row('Address', _profile?['address'] ?? '—'),
                ]),
                const SizedBox(height: 16),

                // Actions
                ListTile(
                  leading: const Icon(Icons.chat_bubble_outline, color: AppColors.primary),
                  title: const Text('AI Assistant'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushNamed(context, AppRoutes.chatbot),
                ),
                const Divider(height: 0),
                ListTile(
                  leading: const Icon(Icons.logout, color: AppColors.error),
                  title: const Text('Sign Out', style: TextStyle(color: AppColors.error)),
                  onTap: () async {
                    await context.read<AppState>().logout();
                    if (mounted) Navigator.pushReplacementNamed(context, AppRoutes.login);
                  },
                ),
              ],
            ),
          ),
    );
  }

  Widget _infoCard(List<Widget> rows) {
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]),
      child: Column(children: rows),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(children: [
        SizedBox(width: 120, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 13))),
        Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
      ]),
    );
  }
}
