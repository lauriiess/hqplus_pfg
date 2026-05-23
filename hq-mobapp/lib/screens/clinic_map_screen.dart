import 'dart:math' as math;
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

  static const _qcCenter = LatLng(14.6460, 121.0275);

  @override
  void initState() {
    super.initState();
    _locate();
    _loadClinics();
  }

  // ── Haversine using dart:math ─────────────────────────────────────────────
  double _distanceKm(double lat1, double lon1, double lat2, double lon2) {
    const r = 6371.0;
    final dLat = (lat2 - lat1) * math.pi / 180;
    final dLon = (lon2 - lon1) * math.pi / 180;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * math.pi / 180) *
            math.cos(lat2 * math.pi / 180) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return r * c;
  }

  Future<void> _locate() async {
    setState(() { _locating = true; _locError = null; });
    try {
      bool svcEnabled = await Geolocator.isLocationServiceEnabled();
      if (!svcEnabled) {
        setState(() { _locating = false; _locError = 'Location services disabled. Enable GPS to see distances.'; });
        return;
      }
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        setState(() { _locating = false; _locError = 'Location permission denied.'; });
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 12),
      );
      if (!mounted) return;
      setState(() { _userPos = pos; _locating = false; });
      _mapCtrl.move(LatLng(pos.latitude, pos.longitude), 13.5);
      _recalcDistances(pos);
    } catch (e) {
      if (mounted) setState(() { _locating = false; _locError = 'Could not get location.'; });
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

  void _recalcDistances(Position pos) {
    _clinics = _clinics.map((c) {
      final dist      = _distanceKm(pos.latitude, pos.longitude, c.latitude, c.longitude);
      // Metro Manila avg: 20 km/h in traffic
      final travelMin = (dist / 20.0 * 60).round();
      final totalMin  = travelMin + c.currentWaitingTime;
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
    _clinics.sort((a, b) => a.totalEstimatedMinutes.compareTo(b.totalEstimatedMinutes));
    if (mounted) setState(() {});
  }

  void _selectClinic(Clinic c) {
    setState(() => _selected = c);
    _mapCtrl.move(LatLng(c.latitude, c.longitude), 15.5);
  }

  Color _waitColor(int wait) {
    if (wait < 30) return Colors.green;
    if (wait < 60) return Colors.orange;
    return Colors.red;
  }

  String _distLabel(Clinic c) {
    if (_userPos == null) return c.address.split(',').first.trim();
    return '${c.distanceKm} km  •  ~${c.travelMinutes} min drive';
  }

  Future<void> _openMaps(Clinic c) async {
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}');
    if (await canLaunchUrl(uri)) launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _call(Clinic c) async {
    final uri = Uri.parse('tel:${c.contactNumber}');
    if (await canLaunchUrl(uri)) launchUrl(uri);
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
        title: const Text('Nearby Clinics', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          if (_locating)
            const Padding(
              padding: EdgeInsets.only(right: 14),
              child: Center(child: SizedBox(width: 18, height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2))),
            )
          else
            IconButton(
              icon: const Icon(Icons.my_location_rounded, color: AppColors.primary),
              tooltip: 'Re-locate me',
              onPressed: _locate,
            ),
        ],
      ),
      body: Column(
        children: [
          // ── MAP ────────────────────────────────────────────────────────
          SizedBox(
            height: 300,
            child: Stack(children: [
              FlutterMap(
                mapController: _mapCtrl,
                options: MapOptions(
                  initialCenter: _qcCenter,
                  initialZoom: 13.0,
                  onTap: (_, __) => setState(() => _selected = null),
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.hqplus.mobapp',
                    maxZoom: 19,
                  ),
                  MarkerLayer(markers: [
                    // User pin
                    if (userLatLng != null)
                      Marker(
                        point: userLatLng,
                        width: 40, height: 40,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.blue,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2.5),
                            boxShadow: [BoxShadow(color: Colors.blue.withOpacity(0.4), blurRadius: 10)],
                          ),
                          child: const Icon(Icons.person_pin_rounded, color: Colors.white, size: 22),
                        ),
                      ),
                    // Clinic pins
                    ..._clinics.map((c) {
                      final isSel = _selected?.id == c.id;
                      final col   = _waitColor(c.currentWaitingTime);
                      return Marker(
                        point: LatLng(c.latitude, c.longitude),
                        width: isSel ? 56 : 44,
                        height: isSel ? 56 : 44,
                        child: GestureDetector(
                          onTap: () => _selectClinic(c),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            decoration: BoxDecoration(
                              color: isSel ? AppColors.primary : Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: isSel ? AppColors.primary : col,
                                  width: isSel ? 3 : 2.5),
                              boxShadow: [BoxShadow(
                                  color: (isSel ? AppColors.primary : col).withOpacity(0.45),
                                  blurRadius: 10)],
                            ),
                            child: Icon(Icons.local_hospital_rounded,
                                color: isSel ? Colors.white : col,
                                size: isSel ? 30 : 22),
                          ),
                        ),
                      );
                    }),
                  ]),
                ],
              ),

              // Legend
              Positioned(
                bottom: 8, left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.95),
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)]),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    _Dot(color: Colors.green),  SizedBox(width: 4), Text('<30m', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                    SizedBox(width: 8),
                    _Dot(color: Colors.orange), SizedBox(width: 4), Text('30-60m', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                    SizedBox(width: 8),
                    _Dot(color: Colors.red),    SizedBox(width: 4), Text('>60m', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                  ]),
                ),
              ),

              // Location error banner
              if (_locError != null)
                Positioned(
                  top: 8, left: 8, right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.orange.shade300)),
                    child: Row(children: [
                      const Icon(Icons.location_off_outlined, color: Colors.orange, size: 16),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_locError!,
                          style: const TextStyle(fontSize: 11, color: Colors.deepOrange))),
                    ]),
                  ),
                ),
            ]),
          ),

          // ── SELECTED CLINIC CARD ────────────────────────────────────────
          if (_selected != null)
            Container(
              margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primary, width: 2),
                boxShadow: [BoxShadow(
                    color: AppColors.primary.withOpacity(0.15),
                    blurRadius: 12, offset: const Offset(0, 4))],
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(_selected!.name,
                      style: const TextStyle(fontWeight: FontWeight.w900,
                          fontSize: 13, color: AppColors.textDark),
                      maxLines: 2, overflow: TextOverflow.ellipsis)),
                  GestureDetector(
                    onTap: () => setState(() => _selected = null),
                    child: const Icon(Icons.close, size: 18, color: AppColors.textMuted),
                  ),
                ]),
                const SizedBox(height: 4),
                Text(_selected!.address,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                const SizedBox(height: 8),
                Wrap(spacing: 12, children: [
                  Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.directions_car_outlined, size: 14, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(_distLabel(_selected!),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                            color: AppColors.primary)),
                  ]),
                  Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.people_outline, size: 14, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text('${_selected!.queueLength} queued  •  ~${_selected!.currentWaitingTime} min wait',
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ]),
                  if (_userPos != null)
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.timer_outlined, size: 14, color: Colors.orange),
                      const SizedBox(width: 4),
                      Text('~${_selected!.totalEstimatedMinutes} min total',
                          style: const TextStyle(fontSize: 12,
                              fontWeight: FontWeight.w700, color: Colors.orange)),
                    ]),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: ElevatedButton.icon(
                    icon: const Icon(Icons.confirmation_number_outlined, size: 15),
                    label: const Text('Go Here'),
                    onPressed: () => Navigator.pushNamed(context, AppRoutes.clinicDetail,
                        arguments: {
                          '_id': _selected!.id, 'name': _selected!.name,
                          'address': _selected!.address,
                          'services': _selected!.services,
                          'currentWaitingTime': _selected!.currentWaitingTime,
                          'queueLength': _selected!.queueLength,
                          'contactNumber': _selected!.contactNumber,
                          'status': _selected!.status,
                        }),
                    style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                  )),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: () => _openMaps(_selected!),
                    style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        padding: const EdgeInsets.all(10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    child: const Icon(Icons.map_outlined, size: 18),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: () => _call(_selected!),
                    style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.green,
                        side: const BorderSide(color: Colors.green),
                        padding: const EdgeInsets.all(10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    child: const Icon(Icons.phone_outlined, size: 18, color: Colors.green),
                  ),
                ]),
              ]),
            ),

          // ── CLINIC LIST ─────────────────────────────────────────────────
          Expanded(
            child: _loadingClinics
                ? const Center(child: CircularProgressIndicator())
                : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
                      child: Text(
                        _userPos != null
                            ? 'Sorted by total time (travel + wait)'
                            : 'All Hi-Precision Branches',
                        style: const TextStyle(color: AppColors.textMuted,
                            fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                    Expanded(
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
                        itemCount: _clinics.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final c     = _clinics[i];
                          final isSel = _selected?.id == c.id;
                          final col   = _waitColor(c.currentWaitingTime);
                          return GestureDetector(
                            onTap: () => _selectClinic(c),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isSel ? AppColors.primary.withOpacity(0.06) : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                    color: isSel ? AppColors.primary : AppColors.border,
                                    width: isSel ? 2 : 1),
                                boxShadow: [BoxShadow(
                                    color: Colors.black.withOpacity(0.04), blurRadius: 6)],
                              ),
                              child: Row(children: [
                                // Rank
                                Container(
                                  width: 34, height: 34,
                                  decoration: BoxDecoration(
                                    color: i == 0
                                        ? Colors.green.withOpacity(0.12)
                                        : AppColors.primary.withOpacity(0.08),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(child: Text('${i + 1}',
                                      style: TextStyle(fontWeight: FontWeight.w900,
                                          fontSize: 13,
                                          color: i == 0 ? Colors.green : AppColors.primary))),
                                ),
                                const SizedBox(width: 10),
                                Expanded(child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(c.name.replaceAll('Hi-Precision Diagnostics - ', ''),
                                        style: const TextStyle(fontWeight: FontWeight.w800,
                                            fontSize: 13, color: AppColors.textDark)),
                                    const SizedBox(height: 2),
                                    Text(_distLabel(c),
                                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                    const SizedBox(height: 4),
                                    Wrap(spacing: 5, runSpacing: 4, children: [
                                      _Badge(label: '${c.queueLength} in queue', color: col),
                                      _Badge(label: '~${c.currentWaitingTime} min wait', color: col),
                                      if (_userPos != null)
                                        _Badge(label: '~${c.totalEstimatedMinutes} min total',
                                            color: AppColors.primary),
                                    ]),
                                  ],
                                )),
                                const Icon(Icons.chevron_right_rounded,
                                    color: AppColors.textMuted, size: 20),
                              ]),
                            ),
                          );
                        },
                      ),
                    ),
                  ]),
          ),
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
        color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(99)),
    child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color)),
  );
}
