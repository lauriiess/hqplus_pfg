import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../data/clinic_data.dart';
import '../services/api_service.dart';

class ClinicDirectoryScreen extends StatefulWidget {
  const ClinicDirectoryScreen({super.key});
  @override
  State<ClinicDirectoryScreen> createState() => _ClinicDirectoryScreenState();
}

class _ClinicDirectoryScreenState extends State<ClinicDirectoryScreen> {
  List<Map<String, dynamic>> _clinics = [];
  List<Map<String, dynamic>> _filtered = [];
  bool _loading = true;
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final raw = await ApiService.getClinics();
      final list = raw.map((c) => c as Map<String, dynamic>).toList();
      if (mounted) {
        setState(() { _clinics = list; _filtered = list; _loading = false; });
      }
    } catch (_) {
      final list = staticClinics.map((c) => {
        '_id': c.id, 'name': c.name, 'address': c.address,
        'services': c.services, 'currentWaitingTime': c.currentWaitingTime,
        'queueLength': c.queueLength, 'distanceKm': c.distanceKm,
        'contactNumber': c.contactNumber, 'status': c.status,
      }).toList();
      if (mounted) {
        setState(() { _clinics = list; _filtered = list; _loading = false; });
      }
    }
  }

  void _filter(String q) {
    setState(() {
      _filtered = q.isEmpty
          ? _clinics
          : _clinics.where((c) =>
              (c['name'] ?? '').toString().toLowerCase().contains(q.toLowerCase()) ||
              (c['address'] ?? '').toString().toLowerCase().contains(q.toLowerCase())).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        title: const Text('Find a Clinic',
            style: TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _search,
              onChanged: _filter,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                hintText: 'Search clinics...',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                      itemCount: _filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) {
                        final c = _filtered[i];
                        final wait = c['currentWaitingTime'] ?? 0;
                        final queue = (c['queueLength'] ?? 0) as int;
                        final busy = queue > 8;
                        return GestureDetector(
                          onTap: () => Navigator.pushNamed(
                              context, AppRoutes.clinicDetail,
                              arguments: c),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                    color: Colors.black.withOpacity(0.04),
                                    blurRadius: 6)
                              ],
                            ),
                            child: Row(children: [
                              Container(
                                width: 44, height: 44,
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.local_hospital_rounded,
                                    color: AppColors.primary),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(c['name'] ?? '',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 13,
                                            color: AppColors.textDark),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 2),
                                    Text(c['address'] ?? '',
                                        style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textMuted),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: busy
                                          ? AppColors.error.withOpacity(0.1)
                                          : AppColors.success.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(99),
                                    ),
                                    child: Text('${wait}m',
                                        style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: busy
                                                ? AppColors.error
                                                : AppColors.success)),
                                  ),
                                  const SizedBox(height: 2),
                                  Text('$queue queued',
                                      style: const TextStyle(
                                          fontSize: 10,
                                          color: AppColors.textMuted)),
                                ],
                              ),
                            ]),
                          ),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
