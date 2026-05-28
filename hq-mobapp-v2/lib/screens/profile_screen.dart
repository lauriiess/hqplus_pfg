import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool isEditing = false;

  // controllers for edit mode
  final _nameCtrl = TextEditingController();
  final _ageCtrl = TextEditingController();
  final _patientTypeCtrl = TextEditingController();
  final _contactCtrl = TextEditingController();
  final _philHealthCtrl = TextEditingController();
  final _hmoCtrl = TextEditingController();

  @override
  void dispose() {
    _nameCtrl.dispose();
    _ageCtrl.dispose();
    _patientTypeCtrl.dispose();
    _contactCtrl.dispose();
    _philHealthCtrl.dispose();
    _hmoCtrl.dispose();
    super.dispose();
  }

  void _syncControllersFromUser(AppState appState) {
    final u = appState.currentUser;
    if (u == null) return;

    _nameCtrl.text = u.fullName;
    _ageCtrl.text = u.age;
    _patientTypeCtrl.text = u.patientType;
    _contactCtrl.text = u.phone;
    _philHealthCtrl.text = u.philHealthNumber;
    _hmoCtrl.text = u.hmoNumber;
  }

  String _initials(String fullName) {
    final parts = fullName.trim().split(RegExp(r"\s+"));
    if (parts.isEmpty || parts.first.isEmpty) return "U";
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }

  void _enterEdit(AppState appState) {
    setState(() {
      _syncControllersFromUser(appState);
      isEditing = true;
    });
  }

  void _cancelEdit(AppState appState) {
    setState(() {
      _syncControllersFromUser(appState);
      isEditing = false;
    });
  }

  void _saveEdit(AppState appState) {
    final u = appState.currentUser;
    if (u == null) return;

    final newName =
        _nameCtrl.text.trim().isEmpty ? u.fullName : _nameCtrl.text.trim();
    final newAge = _ageCtrl.text.trim();
    final newPatientType = _patientTypeCtrl.text.trim().isEmpty
        ? u.patientType
        : _patientTypeCtrl.text.trim();

    appState.updateCurrentUserProfile(
      fullName: newName,
      phone: _contactCtrl.text.trim(),
      age: newAge,
      patientType: newPatientType,
      philHealthNumber: _philHealthCtrl.text.trim(),
      hmoNumber: _hmoCtrl.text.trim(),
    );

    setState(() => isEditing = false);
  }

  void _logout(AppState appState) {
    appState.logout();
    Navigator.pushNamedAndRemoveUntil(context, AppRoutes.login, (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final user = appState.currentUser;

    // if no user logged in
    if (user == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF5F7FB),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          foregroundColor: const Color(0xFF0F172A),
          title: const Text("Profile",
              style: TextStyle(fontWeight: FontWeight.w900)),
          bottom: const PreferredSize(
            preferredSize: Size.fromHeight(1),
            child: Divider(height: 1, color: Color(0xFFE2E8F0)),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.person_outline,
                    size: 54, color: Color(0xFF94A3B8)),
                const SizedBox(height: 10),
                const Text(
                  "You're not logged in.",
                  style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 6),
                const Text(
                  "Please sign in to view and edit your profile.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: Color(0xFF64748B), fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  height: 48,
                  width: 220,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () => Navigator.pushNamedAndRemoveUntil(
                        context, AppRoutes.login, (r) => false),
                    child: const Text("Go to Login",
                        style: TextStyle(fontWeight: FontWeight.w900)),
                  ),
                ),
              ],
            ),
          ),
        ),
        bottomNavigationBar: const _BottomNavMock(selectedIndex: 4),
      );
    }

    final initials = _initials(user.fullName);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: const Color(0xFF0F172A),
        title: const Text("Profile",
            style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          if (!isEditing)
            Padding(
              padding: const EdgeInsets.only(right: 10),
              child: ElevatedButton.icon(
                onPressed: () => _enterEdit(appState),
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: const Text("Edit Profile",
                    style: TextStyle(fontWeight: FontWeight.w900)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
              ),
            )
          else ...[
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: OutlinedButton.icon(
                onPressed: () => _cancelEdit(appState),
                icon: const Icon(Icons.close_rounded, size: 18),
                label: const Text("Cancel",
                    style: TextStyle(fontWeight: FontWeight.w900)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF0F172A),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(right: 10),
              child: ElevatedButton.icon(
                onPressed: () => _saveEdit(appState),
                icon: const Icon(Icons.check_rounded, size: 18),
                label: const Text("Save",
                    style: TextStyle(fontWeight: FontWeight.w900)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF16A34A),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
              ),
            ),
          ],
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: Color(0xFFE2E8F0)),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
          children: [
            // blue header card (from AppState user)
            _BlueProfileCard(
              initials: initials,
              title:
                  isEditing ? "Update your profile" : "Complete your profile",
              subtitle: user.patientType.isEmpty
                  ? "Regular\nPatient"
                  : user.patientType,
              age: user.age.isEmpty ? "Not set" : user.age,
              patientId: user.patientId,
            ),
            const SizedBox(height: 14),

            if (!isEditing) ...[
              _SectionCard(
                title: "Contact Information",
                child: Column(
                  children: [
                    _InfoRow(
                      icon: Icons.call_outlined,
                      label: "Contact Number",
                      value: user.phone.isEmpty ? "Not set" : user.phone,
                    ),
                    const SizedBox(height: 10),
                    _InfoRow(
                      icon: Icons.language_rounded,
                      label: "Email",
                      value: user.email.isEmpty ? "Not set" : user.email,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              _SectionCard(
                title: "Insurance Information",
                leading: const Icon(Icons.credit_card_outlined,
                    color: Color(0xFF0F172A)),
                child: Column(
                  children: [
                    _InsuranceTile(
                      colorStrip: const Color(0xFF22C55E),
                      title: "PhilHealth",
                      value: user.philHealthNumber.isEmpty
                          ? "Not set"
                          : user.philHealthNumber,
                      bg: const Color(0xFFECFDF5),
                    ),
                    const SizedBox(height: 10),
                    _InsuranceTile(
                      colorStrip: const Color(0xFF3B82F6),
                      title: "HMO / Private Insurance",
                      value:
                          user.hmoNumber.isEmpty ? "Not set" : user.hmoNumber,
                      bg: const Color(0xFFEFF6FF),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              const Padding(
                padding: EdgeInsets.only(left: 2, bottom: 10),
                child: Text("Medical Records",
                    style: TextStyle(
                        fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              ),
              _MenuTile(
                icon: Icons.description_outlined,
                title: "Lab Results",
                subtitle: "View your test results",
                onTap: () {},
              ),
              const SizedBox(height: 10),
              _MenuTile(
                icon: Icons.event_note_outlined,
                title: "Visit History",
                subtitle: "12 visits in the past year",
                onTap: () {},
              ),
              const SizedBox(height: 10),
              _MenuTile(
                icon: Icons.receipt_long_outlined,
                title: "Billing & Payments",
                subtitle: "View billing statements",
                onTap: () {},
              ),
              const SizedBox(height: 14),
              const Padding(
                padding: EdgeInsets.only(left: 2, bottom: 10),
                child: Text("Settings",
                    style: TextStyle(
                        fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              ),
              _MenuGroup(
                children: [
                  _MenuTile(
                    icon: Icons.language_outlined,
                    title: "Language",
                    subtitle: "English",
                    onTap: () {},
                  ),
                  _MenuTile(
                    icon: Icons.notifications_none_rounded,
                    title: "Notifications",
                    subtitle: "Manage preferences",
                    onTap: () {},
                  ),
                  _MenuTile(
                    icon: Icons.settings_outlined,
                    title: "Account Settings",
                    subtitle: "Privacy & security",
                    onTap: () {},
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 52,
                child: OutlinedButton.icon(
                  onPressed: () => _logout(appState),
                  icon: const Icon(Icons.logout_rounded),
                  label: const Text("Logout",
                      style: TextStyle(fontWeight: FontWeight.w900)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    side: const BorderSide(color: Color(0xFFFCA5A5)),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    backgroundColor: const Color(0xFFFFF1F2),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              const Center(
                child: Text(
                  "HealthQueue+ v1.0.0",
                  style: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontWeight: FontWeight.w700,
                      fontSize: 12),
                ),
              ),
            ] else ...[
              // edit mode uses controllers
              _FormCard(
                title: "Personal Information",
                children: [
                  _LabeledField(
                      label: "Full Name *",
                      controller: _nameCtrl,
                      hint: "Juan Dela Cruz"),
                  const SizedBox(height: 12),
                  _LabeledField(
                      label: "Age *",
                      controller: _ageCtrl,
                      hint: "35",
                      keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  _LabeledField(
                      label: "Patient Type",
                      controller: _patientTypeCtrl,
                      hint: "Regular Patient"),
                ],
              ),
              const SizedBox(height: 14),

              _FormCard(
                title: "Contact Information",
                children: [
                  _LabeledField(
                    label: "Contact Number *",
                    controller: _contactCtrl,
                    hint: "+63 917 123 4567",
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 12),
                  _LabeledReadOnly(
                    label: "Email (Read-only)",
                    value: user.email.isEmpty ? "Not set" : user.email,
                  ),
                ],
              ),
              const SizedBox(height: 14),

              _FormCard(
                title: "Insurance Information",
                children: [
                  _LabeledField(
                    label: "PhilHealth Number (Optional)",
                    controller: _philHealthCtrl,
                    hint: "12-345678901-2",
                  ),
                  const SizedBox(height: 12),
                  _LabeledField(
                    label: "HMO / Private Insurance (Optional)",
                    controller: _hmoCtrl,
                    hint: "Not set",
                  ),
                ],
              ),
              const SizedBox(height: 14),

              SizedBox(
                height: 52,
                child: OutlinedButton.icon(
                  onPressed: () => _logout(appState),
                  icon: const Icon(Icons.logout_rounded),
                  label: const Text("Logout",
                      style: TextStyle(fontWeight: FontWeight.w900)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    side: const BorderSide(color: Color(0xFFFCA5A5)),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    backgroundColor: const Color(0xFFFFF1F2),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      bottomNavigationBar: const _BottomNavMock(selectedIndex: 4),
    );
  }
}

class _BlueProfileCard extends StatelessWidget {
  final String initials;
  final String title;
  final String subtitle;
  final String age;
  final String patientId;

  const _BlueProfileCard({
    required this.initials,
    required this.title,
    required this.subtitle,
    required this.age,
    required this.patientId,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
        ),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.07),
              blurRadius: 18,
              offset: const Offset(0, 10)),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 18),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 14)),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.90),
                          fontWeight: FontWeight.w700,
                          fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _BlueStat(label: "Age", value: age)),
              const SizedBox(width: 10),
              Expanded(child: _BlueStat(label: "Patient ID", value: patientId)),
            ],
          ),
        ],
      ),
    );
  }
}

class _BlueStat extends StatelessWidget {
  final String label;
  final String value;

  const _BlueStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.16),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(
                  color: Colors.white.withOpacity(0.85),
                  fontWeight: FontWeight.w800,
                  fontSize: 12)),
          const SizedBox(height: 6),
          Text(value,
              style: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? leading;

  const _SectionCard({
    required this.title,
    required this.child,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 12,
              offset: const Offset(0, 8)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (leading != null) ...[
                leading!,
                const SizedBox(width: 8),
              ],
              Text(title,
                  style: const TextStyle(
                      fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: const Color(0xFF64748B)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontWeight: FontWeight.w800,
                      fontSize: 12)),
              const SizedBox(height: 2),
              Text(value,
                  style: const TextStyle(
                      color: Color(0xFF0F172A), fontWeight: FontWeight.w900)),
            ],
          ),
        ),
      ],
    );
  }
}

class _InsuranceTile extends StatelessWidget {
  final Color colorStrip;
  final String title;
  final String value;
  final Color bg;

  const _InsuranceTile({
    required this.colorStrip,
    required this.title,
    required this.value,
    required this.bg,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 56,
            decoration: BoxDecoration(
              color: colorStrip,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A))),
                  const SizedBox(height: 3),
                  Text(value,
                      style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(right: 12),
            child: Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }
}

class _MenuGroup extends StatelessWidget {
  final List<Widget> children;
  const _MenuGroup({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: children
            .map((w) => Column(
                  children: [
                    w,
                    if (w != children.last)
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),
                  ],
                ))
            .toList(),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MenuTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: const Color(0xFF64748B), size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A))),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontWeight: FontWeight.w700,
                          fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }
}

class _FormCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _FormCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF3B82F6), width: 1.2),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 12,
              offset: const Offset(0, 8)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboardType;

  const _LabeledField({
    required this.label,
    required this.controller,
    required this.hint,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    const BorderSide(color: Color(0xFF3B82F6), width: 1.4)),
          ),
        ),
      ],
    );
  }
}

class _LabeledReadOnly extends StatelessWidget {
  final String label;
  final String value;

  const _LabeledReadOnly({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w800, color: Color(0xFF64748B))),
        ),
      ],
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
      type: BottomNavigationBarType.fixed,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: const Color(0xFF64748B),
      onTap: (i) {
        if (i == 0) {
          Navigator.pushNamed(context, AppRoutes.dashboard);
          return;
        }
        if (i == 1) {
          Navigator.pushNamed(context, AppRoutes.appointments);
          return;
        }
        if (i == 2) {
          Navigator.pushNamed(context, AppRoutes.chatBot);
          return;
        }
        if (i == 3) {
          Navigator.pushNamed(context, AppRoutes.queueMonitoring);
          return;
        }
        if (i == 4) {
          Navigator.pushNamed(context, AppRoutes.profile);
          return;
        }
      },
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: "Home"),
        BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today_outlined), label: "Appointments"),
        BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline), label: "Chatbot"),
        BottomNavigationBarItem(
            icon: Icon(Icons.confirmation_number_outlined), label: "Queue"),
        BottomNavigationBarItem(
            icon: Icon(Icons.person_outline), label: "Profile"),
      ],
    );
  }
}
