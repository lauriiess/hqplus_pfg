import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../data/clinic_data.dart';
import '../models/clinic_models.dart';
import '../services/api_service.dart';

class ClinicMapScreen extends StatefulWidget {
  const ClinicMapScreen({super.key});
  @override
  State<ClinicMapScreen> createState() => _ClinicMapScreenState();
}

class _ClinicMapScreenState extends State<ClinicMapScreen> {
  final MapController _mapCtrl = MapController();

  List<Clinic> _clinics = [];
  Clinic? _selected;
  Position? _userPos;
  bool _locating = true;
  bool _loadingClinics = true;
  String? _locError;

  // Default center: Quezon City
  static const _qcCenter = LatLng(14.6460, 121.0275);

  @override
  void initState() {
    super.initState();
    _locate();
    _loadClinics();
  }

  Future<void> _locate() async {
    setState(() { _locating = true; _locError = null; });
    try {
      bool enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        setState(() { _locating = false; _locError = 'Location services are disabled.'; });
        return;
      }
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever) {
        setState(() { _locating = false; _locError = 'Location permission permanently denied.'; });
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 10));
      if (mounted) {
        setState(() { _userPos = pos; _locating = false; });
        _mapCtrl.move(LatLng(pos.latitude, pos.longitude), 13.5);
        _recalcDistances(pos);
      }
    } catch (e) {
      if (mounted) setState(() { _locating = false; _locError = e.toString(); });
    }
  }

  Future<void> _loadClinics() async {
    try {
      final raw = await ApiService.getClinics();
      if (raw.isNotEmpty) {
        _clinics = raw.map((c) => Clinic.fromJson(c as Map<String, dynamic>)).toList();
      } else {
        _clinics = List.from(staticClinics);
      }
    } catch (_) {
      _clinics = List.from(staticClinics);
    }
    if (mounted) {
      setState(() => _loadingClinics = false);
      if (_userPos != null) _recalcDistances(_userPos!);
    }
  }

  // Haversine distance + rough travel time estimate
  double _haversine(double lat1, double lon1, double lat2, double lon2) {
    const r = 6371.0;
    final dLat = (lat2 - lat1) * 3.14159265 / 180;
    final dLon = (lon2 - lon1) * 3.14159265 / 180;
    final a = _sin2(dLat / 2) +
        _cos(lat1 * 3.14159265 / 180) *
        _cos(lat2 * 3.14159265 / 180) *
        _sin2(dLon / 2);
    final c = 2 * _atan2(_sqrt(a), _sqrt(1 - a));
    return r * c;
  }

  double _sin2(double x) => _sin(x) * _sin(x);
  double _sin(double x) {
    double sum = x;
    double term = x;
    for (int i = 1; i <= 10; i++) {
      term *= -x * x / ((2 * i) * (2 * i + 1));
      sum += term;
    }
    return sum;
  }
  double _cos(double x) => _sin(3.14159265 / 2 - x);
  double _sqrt(double x) => x <= 0 ? 0 : x * _inv(_sqrt1(x));
  double _sqrt1(double x) {
    double r = x;
    for (int i = 0; i < 20; i++) r = (r + x / r) / 2;
    return r;
  }
  double _inv(double x) => x == 0 ? 0 : 1 / x;
  double _atan2(double y, double x) {
    if (x > 0) return _atan(y / x);
    if (x < 0 && y >= 0) return _atan(y / x) + 3.14159265;
    if (x < 0 && y < 0)  return _atan(y / x) - 3.14159265;
    if (x == 0 && y > 0) return 3.14159265 / 2;
    return -3.14159265 / 2;
  }
  double _atan(double x) {
    double sum = x;
    double term = x;
    for (int i = 1; i <= 15; i++) {
      term *= -x * x * (2 * i - 1) / (2 * i + 1);
      sum += term;
    }
    return sum;
  }

  void _recalcDistances(Position pos) {
    if (_clinics.isEmpty) return;
    _clinics = _clinics.map((c) {
      final dist = _haversine(pos.latitude, pos.longitude, c.latitude, c.longitude);
      // Estimate travel time: avg 20 km/h in Metro Manila traffic
      final travelMin = (dist / 20.0 * 60).round();
      final totalMin = travelMin + c.currentWaitingTime;
      return Clinic(
        id: c.id, name: c.name, address: c.address,
        latitude: c.latitude, longitude: c.longitude,
        services: c.services,
        baseWaitTimePerPerson: c.baseWaitTimePerPerson,
        queueLength: c.queueLength,
        distanceKm: double.parse(dist.toStringAsFixed(1)),
        currentWaitingTime: c.currentWaitingTime,
        totalEstimatedMinutes: totalMin,
        travelMinutes: travelMin,
        contactNumber: c.contactNumber,
        status: c.status,
        peakHours: c.peakHours,
      );
    }).toList();
    // Sort by total estimated time (travel + wait)
    _clinics.sort((a, b) => a.totalEstimatedMinutes.compareTo(b.totalEstimatedMinutes));
    setState(() {});
  }

  void _selectClinic(Clinic c) {
    setState(() => _selected = c);
    _mapCtrl.move(LatLng(c.latitude, c.longitude), 15.0);
  }

  String _distLabel(Clinic c) {
    if (_userPos == null) return c.address.split(',').last.trim();
    return '${c.distanceKm} km · ~${c.travelMinutes} min drive';
  }

  Color _waitColor(int wait) {
    if (wait < 30) return Colors.green;
    if (wait < 60) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    final userLatLng = _userPos != null
        ? LatLng(_userPos!.latitude, _userPos!.longitude)
        : null;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        title: const Text('Find Nearby Clinics',
            style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          if (_locating)
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: Center(
                  child: SizedBox(
                      width: 18, height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))),
            )
          else
            IconButton(
              icon: const Icon(Icons.my_location_rounded, color: AppColors.primary),
              tooltip: 'Re-center on my location',
              onPressed: _locate,
            ),
        ],
      ),
      body: Column(
        children: [
          // ── MAP ────────────────────────────────────────────────────────
          SizedBox(
            height: 280,
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapCtrl,
                  options: MapOptions(
                    initialCenter: _qcCenter,
                    initialZoom: 13.0,
                    onTap: (_, __) => setState(() => _selected = null),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.hqplus.mobapp',
                    ),
                    MarkerLayer(
                      markers: [
                        // User location
                        if (userLatLng != null)
                          Marker(
                            point: userLatLng,
                            width: 36,
                            height: 36,
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.blue,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                boxShadow: [
                                  BoxShadow(color: Colors.blue.withOpacity(0.4), blurRadius: 8)
                                ],
                              ),
                              child: const Icon(Icons.person_pin_circle_rounded,
                                  color: Colors.white, size: 20),
                            ),
                          ),
                        // Clinic markers
                        ..._clinics.map((c) {
                          final isSel = _selected?.id == c.id;
                          return Marker(
                            point: LatLng(c.latitude, c.longitude),
                            width: isSel ? 52 : 40,
                            height: isSel ? 52 : 40,
                            child: GestureDetector(
                              onTap: () => _selectClinic(c),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                decoration: BoxDecoration(
                                  color: isSel ? AppColors.primary : Colors.white,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                      color: isSel ? AppColors.primary : _waitColor(c.currentWaitingTime),
                                      width: isSel ? 3 : 2),
                                  boxShadow: [
                                    BoxShadow(
                                        color: (isSel ? AppColors.primary : _waitColor(c.currentWaitingTime))
                                            .withOpacity(0.4),
                                        blurRadius: 8)
                                  ],
                                ),
                                child: Icon(Icons.local_hospital_rounded,
                                    color: isSel ? Colors.white : _waitColor(c.currentWaitingTime),
                                    size: isSel ? 28 : 22),
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
                  ],
                ),
                // Legend
                Positioned(
                  bottom: 8, left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.95),
                        borderRadius: BorderRadius.circular(8)),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      _Dot(color: Colors.green),  SizedBox(width: 4), Text('<30m', style: TextStyle(fontSize: 10)),
                      SizedBox(width: 8),
                      _Dot(color: Colors.orange), SizedBox(width: 4), Text('30-60m', style: TextStyle(fontSize: 10)),
                      SizedBox(width: 8),
                      _Dot(color: Colors.red),    SizedBox(width: 4), Text('>60m', style: TextStyle(fontSize: 10)),
                    ]),
                  ),
                ),
                if (_locError != null)
                  Positioned(
                    top: 8, left: 8, right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                          color: Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.orange.shade200)),
                      child: Row(children: [
                        const Icon(Icons.location_off, color: Colors.orange, size: 16),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_locError!,
                            style: const TextStyle(fontSize: 11, color: Colors.orange))),
                      ]),
                    ),
                  ),
              ],
            ),
          ),

          // ── SELECTED CLINIC CARD ────────────────────────────────────────
          if (_selected != null)
            _SelectedCard(
              clinic: _selected!,
              distLabel: _distLabel(_selected!),
              userPos: _userPos,
              onClose: () => setState(() => _selected = null),
            ),

          // ── CLINIC LIST ─────────────────────────────────────────────────
          Expanded(
            child: _loadingClinics
                ? const Center(child: CircularProgressIndicator())
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
                        child: Text(
                          _userPos != null
                              ? 'Sorted by total time (travel + wait)'
                              : 'All Branches',
                          style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 12,
                              fontWeight: FontWeight.w600),
                        ),
                      ),
                      Expanded(
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          itemCount: _clinics.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            final c = _clinics[i];
                            final isSel = _selected?.id == c.id;
                            return GestureDetector(
                              onTap: () => _selectClinic(c),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isSel
                                      ? AppColors.primary.withOpacity(0.06)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                      color: isSel
                                          ? AppColors.primary
                                          : AppColors.border,
                                      width: isSel ? 2 : 1),
                                  boxShadow: [
                                    BoxShadow(
                                        color: Colors.black.withOpacity(0.04),
                                        blurRadius: 6)
                                  ],
                                ),
                                child: Row(children: [
                                  // Rank bubble
                                  Container(
                                    width: 32, height: 32,
                                    decoration: BoxDecoration(
                                        color: i == 0
                                            ? Colors.green.withOpacity(0.1)
                                            : AppColors.primary.withOpacity(0.08),
                                        shape: BoxShape.circle),
                                    child: Center(
                                        child: Text('${i + 1}',
                                            style: TextStyle(
                                                fontWeight: FontWeight.w900,
                                                fontSize: 13,
                                                color: i == 0
                                                    ? Colors.green
                                                    : AppColors.primary))),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                            c.name.replaceAll('Hi-Precision Diagnostics - ', ''),
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                                fontSize: 13,
                                                color: AppColors.textDark)),
                                        const SizedBox(height: 2),
                                        Text(_distLabel(c),
                                            style: const TextStyle(
                                                fontSize: 11,
                                                color: AppColors.textMuted)),
                                        const SizedBox(height: 4),
                                        Row(children: [
                                          _Badge(
                                            label: '${c.queueLength} queued',
                                            color: _waitColor(c.currentWaitingTime),
                                          ),
                                          const SizedBox(width: 6),
                                          _Badge(
                                            label: '~${c.currentWaitingTime} min wait',
                                            color: _waitColor(c.currentWaitingTime),
                                          ),
                                          if (_userPos != null) ...[
                                            const SizedBox(width: 6),
                                            _Badge(
                                              label: '~${c.totalEstimatedMinutes} min total',
                                              color: AppColors.primary,
                                            ),
                                          ],
                                        ]),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right_rounded,
                                      color: AppColors.textMuted),
                                ]),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Selected Clinic Bottom Card ─────────────────────────────────────────────
class _SelectedCard extends StatelessWidget {
  final Clinic clinic;
  final String distLabel;
  final Position? userPos;
  final VoidCallback onClose;
  const _SelectedCard(
      {required this.clinic,
      required this.distLabel,
      required this.userPos,
      required this.onClose});

  Future<void> _openMaps(Clinic c) async {
    final uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}');
    if (await canLaunchUrl(uri)) launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _call(Clinic c) async {
    final uri = Uri.parse('tel:${c.contactNumber}');
    if (await canLaunchUrl(uri)) launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary, width: 2),
        boxShadow: [
          BoxShadow(
              color: AppColors.primary.withOpacity(0.12),
              blurRadius: 12,
              offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Text(clinic.name,
                  style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                      color: AppColors.textDark),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis),
            ),
            IconButton(
                onPressed: onClose,
                icon: const Icon(Icons.close, size: 18, color: AppColors.textMuted),
                padding: EdgeInsets.zero, constraints: const BoxConstraints()),
          ]),
          const SizedBox(height: 4),
          Text(clinic.address,
              style:
                  const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.directions_car_outlined,
                size: 14, color: AppColors.primary),
            const SizedBox(width: 4),
            Text(distLabel,
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary)),
            const SizedBox(width: 12),
            const Icon(Icons.people_outline, size: 14, color: AppColors.textMuted),
            const SizedBox(width: 4),
            Text('${clinic.queueLength} queued · ~${clinic.currentWaitingTime} min wait',
                style:
                    const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ]),
          if (userPos != null) ...[
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.timer_outlined, size: 14, color: Colors.orange),
              const SizedBox(width: 4),
              Text('~${clinic.totalEstimatedMinutes} min total (travel + wait)',
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.orange)),
            ]),
          ],
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: ElevatedButton.icon(
                icon: const Icon(Icons.confirmation_number_outlined, size: 16),
                label: const Text('Join Queue'),
                onPressed: () => Navigator.pushNamed(
                    context, AppRoutes.clinicDetail,
                    arguments: {
                      '_id': clinic.id, 'name': clinic.name,
                      'address': clinic.address, 'services': clinic.services,
                      'currentWaitingTime': clinic.currentWaitingTime,
                      'queueLength': clinic.queueLength,
                      'contactNumber': clinic.contactNumber, 'status': clinic.status,
                    }),
                style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10))),
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: () => _openMaps(clinic),
              style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10))),
              child: const Icon(Icons.map_outlined, size: 18),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: () => _call(clinic),
              style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.green,
                  side: const BorderSide(color: Colors.green),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10))),
              child: const Icon(Icons.phone_outlined, size: 18, color: Colors.green),
            ),
          ]),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  final Color color;
  const _Dot({required this.color});
  @override
  Widget build(BuildContext context) => Container(
      width: 10, height: 10,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle));
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  const _Badge({required this.label, required this.color});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(99)),
        child: Text(label,
            style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: color)));
}
