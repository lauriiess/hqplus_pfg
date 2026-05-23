import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../core/routes/app_routes.dart';
import '../core/theme/app_theme.dart';
import '../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _profile;
  bool   _loading = true;
  bool   _editing = false;
  bool   _saving  = false;
  String? _error;

  final _nameCtrl    = TextEditingController();
  final _phoneCtrl   = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _bTypeCtrl   = TextEditingController();

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() {
    _nameCtrl.dispose(); _phoneCtrl.dispose();
    _addressCtrl.dispose(); _bTypeCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.getMyPatientProfile();
      final p = data['user'] ?? data;
      if (mounted) {
        _nameCtrl.text    = p['fullName']  ?? '';
        _phoneCtrl.text   = p['phone']     ?? '';
        _addressCtrl.text = p['address']   ?? '';
        _bTypeCtrl.text   = p['bloodType'] ?? '';
        setState(() { _profile = p; _loading = false; });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ApiService.updateMyPatientProfile({
        'fullName':  _nameCtrl.text.trim(),
        'phone':     _phoneCtrl.text.trim(),
        'address':   _addressCtrl.text.trim(),
        'bloodType': _bTypeCtrl.text.trim(),
      });
      if (mounted) {
        setState(() { _editing = false; });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated'), backgroundColor: AppColors.success));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true),  child: const Text('Logout', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirm == true && mounted) {
      await context.read<AppState>().logout();
      Navigator.pushNamedAndRemoveUntil(context, AppRoutes.login, (_) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().currentUser;
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        backgroundColor: AppColors.primary, foregroundColor: Colors.white,
        actions: [
          if (!_loading && _error == null)
            TextButton(
              onPressed: _editing ? (_saving ? null : _save) : () => setState(() => _editing = true),
              child: _saving
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(_editing ? 'Save' : 'Edit', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ),
        ],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _load, child: const Text('Retry')),
            ]))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(children: [
                // Avatar
                Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [AppColors.bgTop, AppColors.bgBottom]),
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 12, offset: const Offset(0,4))],
                  ),
                  child: Center(child: Text(
                    (user?.fullName.isNotEmpty == true) ? user!.fullName[0].toUpperCase() : 'P',
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white),
                  )),
                ),
                const SizedBox(height: 12),
                Text(user?.fullName ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                Text(user?.email ?? '', style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                const SizedBox(height: 24),

                // Fields
                _Field(ctrl: _nameCtrl,    label: 'Full Name',    icon: Icons.person_outline,   enabled: _editing),
                const SizedBox(height: 12),
                _Field(ctrl: _phoneCtrl,   label: 'Phone Number', icon: Icons.phone_outlined,    enabled: _editing, type: TextInputType.phone),
                const SizedBox(height: 12),
                _Field(ctrl: _addressCtrl, label: 'Address',      icon: Icons.home_outlined,     enabled: _editing),
                const SizedBox(height: 12),
                _Field(ctrl: _bTypeCtrl,   label: 'Blood Type',   icon: Icons.bloodtype_outlined, enabled: _editing),

                const SizedBox(height: 32),
                SizedBox(width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _logout,
                    icon: const Icon(Icons.logout, color: Colors.red),
                    label: const Text('Logout', style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red), minimumSize: const Size.fromHeight(48)),
                  ),
                ),
              ]),
            ),
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController ctrl;
  final String label; final IconData icon; final bool enabled;
  final TextInputType type;
  const _Field({required this.ctrl, required this.label, required this.icon, required this.enabled, this.type = TextInputType.text});
  @override
  Widget build(BuildContext context) => TextFormField(
    controller: ctrl, enabled: enabled, keyboardType: type,
    decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon),
      fillColor: enabled ? Colors.white : Colors.grey.shade50),
  );
}
