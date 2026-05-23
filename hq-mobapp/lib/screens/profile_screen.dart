import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool editing = false;
  late TextEditingController nameCtrl, phoneCtrl, ageCtrl, philCtrl, hmoCtrl;

  @override void initState() {
    super.initState();
    final u = context.read<AppState>().currentUser;
    nameCtrl  = TextEditingController(text: u?.fullName ?? '');
    phoneCtrl = TextEditingController(text: u?.phone    ?? '');
    ageCtrl   = TextEditingController(text: u?.age      ?? '');
    philCtrl  = TextEditingController(text: u?.philHealthNumber ?? '');
    hmoCtrl   = TextEditingController(text: u?.hmoNumber        ?? '');
  }
  @override void dispose() {
    nameCtrl.dispose(); phoneCtrl.dispose(); ageCtrl.dispose();
    philCtrl.dispose(); hmoCtrl.dispose(); super.dispose();
  }

  void _save() {
    context.read<AppState>().updateCurrentUserProfile(
      fullName: nameCtrl.text.trim(),
      phone:    phoneCtrl.text.trim(),
      age:      ageCtrl.text.trim(),
      philHealthNumber: philCtrl.text.trim(),
      hmoNumber: hmoCtrl.text.trim(),
    );
    setState(() => editing = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile updated.')));
  }

  @override
  Widget build(BuildContext context) {
    final u = context.watch<AppState>().currentUser;
    if (u == null) {
      return Scaffold(body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Text('Not logged in'),
        TextButton(onPressed: () => Navigator.pushReplacementNamed(context, AppRoutes.login),
          child: const Text('Go to Login')),
      ])));
    }

    final initials = u.fullName.trim().split(' ')
        .where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white, foregroundColor: AppColors.textDark,
        title: const Text('My Profile', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          if (!editing)
            IconButton(icon: const Icon(Icons.edit_outlined), onPressed: () => setState(() => editing = true))
          else
            TextButton(onPressed: _save, child: const Text('Save', style: TextStyle(fontWeight: FontWeight.w800))),
        ]),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Avatar
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.bgTop, AppColors.bgBottom]),
              shape: BoxShape.circle),
            child: Center(child: Text(initials,
              style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)))),
          const SizedBox(height: 12),
          Text(u.fullName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textDark)),
          Text(u.email, style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 24),

          // Info Card
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)]),
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              _ProfileField(label: 'Full Name',   ctrl: nameCtrl,  icon: Icons.person_outline,     editing: editing),
              _ProfileField(label: 'Phone',       ctrl: phoneCtrl, icon: Icons.phone_outlined,      editing: editing),
              _ProfileField(label: 'Age',         ctrl: ageCtrl,   icon: Icons.cake_outlined,       editing: editing),
              _ProfileField(label: 'PhilHealth',  ctrl: philCtrl,  icon: Icons.health_and_safety_outlined, editing: editing),
              _ProfileField(label: 'HMO No.',     ctrl: hmoCtrl,   icon: Icons.card_membership_outlined, editing: editing, isLast: true),
            ])),

          const SizedBox(height: 24),

          // Stats Row
          Row(children: [
            _StatCard(icon: Icons.calendar_month_outlined, color: AppColors.primary,
              label: 'Appointments', value: '${context.watch<AppState>().appointments.length}'),
            const SizedBox(width: 12),
            _StatCard(icon: Icons.confirmation_number_outlined, color: Colors.orange,
              label: 'Queue Tickets', value: '${context.watch<AppState>().queues.length}'),
          ]),

          const SizedBox(height: 24),

          // Logout
          SizedBox(width: double.infinity, child: OutlinedButton.icon(
            icon: const Icon(Icons.logout_rounded, color: Colors.red),
            label: const Text('Sign Out', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w800)),
            onPressed: () async {
              await context.read<AppState>().logout();
              if (!context.mounted) return;
              Navigator.pushReplacementNamed(context, AppRoutes.login);
            },
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))))),
        ])));
  }
}

class _ProfileField extends StatelessWidget {
  final String label;
  final TextEditingController ctrl;
  final IconData icon;
  final bool editing;
  final bool isLast;
  const _ProfileField({required this.label, required this.ctrl, required this.icon,
    required this.editing, this.isLast = false});
  @override
  Widget build(BuildContext context) => Column(children: [
    Row(children: [
      Icon(icon, size: 18, color: AppColors.textMuted),
      const SizedBox(width: 10),
      SizedBox(width: 90, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600, fontSize: 13))),
      Expanded(child: editing
        ? TextField(controller: ctrl,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 6)))
        : Text(ctrl.text.isEmpty ? '—' : ctrl.text,
            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textDark))),
    ]),
    if (!isLast) const Divider(height: 20),
  ]);
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label, value;
  const _StatCard({required this.icon, required this.color, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Expanded(child: Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)]),
    child: Row(children: [
      Container(width: 40, height: 40,
        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: color, size: 20)),
      const SizedBox(width: 10),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
      ]),
    ])));
}
