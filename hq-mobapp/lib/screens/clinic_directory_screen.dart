import 'package:flutter/material.dart';
import '../core/routes/app_routes.dart';
import '../core/theme/app_theme.dart';
import '../services/api_service.dart';

class ClinicDirectoryScreen extends StatefulWidget {
  const ClinicDirectoryScreen({super.key});
  @override
  State<ClinicDirectoryScreen> createState() => _ClinicDirectoryScreenState();
}

class _ClinicDirectoryScreenState extends State<ClinicDirectoryScreen> {
  List<dynamic> _clinics = [];
  List<dynamic> _filtered = [];
  bool   _loading = true;
  String? _error;
  final _searchCtrl = TextEditingController();

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.getClinicDirectory();
      if (mounted) setState(() { _clinics = data; _filtered = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  void _filter(String q) {
    setState(() {
      _filtered = q.isEmpty
        ? _clinics
        : _clinics.where((c) =>
            (c['name']?.toString().toLowerCase().contains(q.toLowerCase()) ?? false) ||
            (c['city']?.toString().toLowerCase().contains(q.toLowerCase()) ?? false) ||
            (c['facilityType']?.toString().toLowerCase().contains(q.toLowerCase()) ?? false)
          ).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Find a Clinic'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(children: [
        // Search bar
        Container(
          color: AppColors.primary,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: TextField(
            controller: _searchCtrl,
            onChanged: _filter,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Search clinics or city...',
              hintStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
              prefixIcon: const Icon(Icons.search, color: Colors.white70),
              filled: true,
              fillColor: Colors.white.withOpacity(0.2),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),

        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
            ? _ErrorView(message: _error!, onRetry: _load)
            : _filtered.isEmpty
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.location_off_outlined, size: 56, color: Colors.grey.shade300),
                  const SizedBox(height: 12),
                  const Text('No clinics found', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
                ]))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) {
                      final c = _filtered[i] as Map<String, dynamic>;
                      return GestureDetector(
                        onTap: () => Navigator.pushNamed(context, AppRoutes.clinicDetail, arguments: c),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0,2))],
                          ),
                          child: Row(children: [
                            Container(
                              width: 48, height: 48,
                              decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(12)),
                              child: const Icon(Icons.local_hospital_outlined, color: AppColors.primary, size: 26),
                            ),
                            const SizedBox(width: 14),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(c['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textDark)),
                              const SizedBox(height: 3),
                              Text('${c['city'] ?? ''} · ${c['facilityType'] ?? 'Clinic'}',
                                style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                              const SizedBox(height: 5),
                              Row(children: [
                                if (c['acceptsWalkIn'] == true) _Tag('Walk-in', const Color(0xFF0D9488)),
                                if (c['acceptsAppointment'] == true) ...[
                                  const SizedBox(width: 5),
                                  _Tag('Appt', AppColors.primary),
                                ],
                              ]),
                            ])),
                            const Icon(Icons.chevron_right, color: AppColors.textMuted),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ]),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label; final Color color;
  const _Tag(this.label, this.color);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(99)),
    child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color)),
  );
}

class _ErrorView extends StatelessWidget {
  final String message; final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(
    padding: const EdgeInsets.all(32),
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(Icons.cloud_off_outlined, size: 56, color: Colors.grey.shade300),
      const SizedBox(height: 12),
      Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
      const SizedBox(height: 20),
      ElevatedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Retry')),
    ]),
  ));
}
