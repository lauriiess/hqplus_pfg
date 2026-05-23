import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/theme/app_theme.dart';
import '../core/routes/app_routes.dart';
import '../services/api_service.dart';

class ClinicDetailScreen extends StatefulWidget {
  const ClinicDetailScreen({super.key});
  @override
  State<ClinicDetailScreen> createState() => _ClinicDetailScreenState();
}

class _ClinicDetailScreenState extends State<ClinicDetailScreen> {
  Map<String, dynamic>? _clinic;
  bool   _loading    = false;
  bool   _joiningQueue = false;
  String? _error;
  String? _selectedService;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_clinic == null) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map<String, dynamic>) {
        setState(() => _clinic = args);
      }
    }
  }

  Future<void> _joinQueue() async {
    final clinic = _clinic;
    if (clinic == null) return;
    if (_selectedService == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a service first'), backgroundColor: AppColors.warning));
      return;
    }
    setState(() => _joiningQueue = true);
    try {
      await ApiService.joinQueue(
        clinicId:    clinic['_id']?.toString() ?? '',
        serviceName: _selectedService!,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Joined queue for $_selectedService!'), backgroundColor: AppColors.success));
        Navigator.pushNamed(context, AppRoutes.queueStatus);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _joiningQueue = false);
    }
  }

  Future<void> _callClinic(String? phone) async {
    if (phone == null || phone.isEmpty) return;
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final c = _clinic;
    if (c == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final services = (c['services'] as List<dynamic>?) ?? [];
    final acceptsWalkIn   = c['acceptsWalkIn']    == true;
    final acceptsAppt     = c['acceptsAppointment'] == true;
    final phone           = c['contactNumber']?.toString() ?? '';
    final hours           = c['operatingHours']?.toString() ?? '—';
    final address         = c['address']?.toString() ?? '';
    final city            = c['city']?.toString() ?? '';
    final facilityType    = c['facilityType']?.toString() ?? 'Health Center';

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: CustomScrollView(
        slivers: [
          // Gradient header
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
                    colors: [AppColors.bgTop, AppColors.bgBottom]),
                ),
                padding: const EdgeInsets.fromLTRB(20, 100, 20, 20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.end, children: [
                  Row(children: [
                    Container(width: 50, height: 50,
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
                      child: const Icon(Icons.local_hospital_rounded, color: AppColors.primary, size: 28)),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(c['name']?.toString() ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
                      Text(facilityType, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
                    ])),
                  ]),
                  const SizedBox(height: 10),
                  Row(children: [
                    if (acceptsWalkIn) _Chip('Walk-in'),
                    if (acceptsAppt)   ...[const SizedBox(width: 8), _Chip('Appointments')],
                  ]),
                ]),
              ),
            ),
          ),

          SliverPadding(
            padding: const EdgeInsets.all(20),
            sliver: SliverList(delegate: SliverChildListDelegate([

              // Info card
              _InfoSection(children: [
                if (address.isNotEmpty) _InfoRow(Icons.location_on_outlined, '$address, $city'),
                _InfoRow(Icons.access_time_outlined, hours),
                if (phone.isNotEmpty) GestureDetector(
                  onTap: () => _callClinic(phone),
                  child: _InfoRow(Icons.phone_outlined, phone, color: AppColors.primary),
                ),
                _InfoRow(Icons.people_outline, 'Max ${c['maxQueueCapacity'] ?? 60} patients/day'),
              ]),
              const SizedBox(height: 20),

              // Services
              const Text('Available Services', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textDark)),
              const SizedBox(height: 10),

              if (services.isEmpty)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                  child: const Center(child: Column(children: [
                    Icon(Icons.medical_services_outlined, size: 36, color: AppColors.textMuted),
                    SizedBox(height: 8),
                    Text('No services listed yet', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                  ])),
                )
              else
                ...services.map((s) {
                  final name = s is Map ? s['name']?.toString() : s.toString();
                  if (name == null) return const SizedBox.shrink();
                  final selected = _selectedService == name;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedService = selected ? null : name),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: selected ? const Color(0xFFEFF6FF) : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: selected ? AppColors.primary : const Color(0xFFEEEEEE), width: selected ? 2 : 1),
                      ),
                      child: Row(children: [
                        Icon(Icons.medical_services_outlined,
                          color: selected ? AppColors.primary : AppColors.textMuted, size: 20),
                        const SizedBox(width: 12),
                        Expanded(child: Text(name,
                          style: TextStyle(fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                            color: selected ? AppColors.primary : AppColors.textDark, fontSize: 14))),
                        if (selected) const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
                      ]),
                    ),
                  );
                }),

              const SizedBox(height: 24),

              // Action buttons
              if (acceptsWalkIn) ...[
                ElevatedButton.icon(
                  onPressed: _joiningQueue ? null : _joinQueue,
                  icon: _joiningQueue
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.queue_outlined),
                  label: Text(_joiningQueue ? 'Joining…' : 'Join Walk-in Queue'),
                  style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
                ),
                const SizedBox(height: 10),
              ],
              if (acceptsAppt) OutlinedButton.icon(
                onPressed: () => Navigator.pushNamed(context, AppRoutes.bookAppointment, arguments: c),
                icon: const Icon(Icons.calendar_month_outlined),
                label: const Text('Book Appointment'),
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
              ),

              const SizedBox(height: 30),
            ])),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  const _Chip(this.label);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(99)),
    child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
  );
}

class _InfoSection extends StatelessWidget {
  final List<Widget> children;
  const _InfoSection({required this.children});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0,2))]),
    child: Column(children: children.map((c) => Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: c)).toList()),
  );
}

Widget _InfoRow(IconData icon, String text, {Color? color}) => Row(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    Icon(icon, size: 16, color: color ?? AppColors.textMuted),
    const SizedBox(width: 10),
    Expanded(child: Text(text, style: TextStyle(fontSize: 13, color: color ?? AppColors.textMuted, height: 1.4))),
  ],
);
