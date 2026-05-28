import 'package:flutter/foundation.dart';
import 'api_service.dart';

/// Thin wrapper around ApiService for clinic-related calls.
/// The [Clinic] model is defined here and shared with screens.
class Clinic {
  final String id;
  final String name;
  final String address;
  final double? latitude;
  final double? longitude;
  final List<String> services;
  final int? queueCount;
  final int? waitMinutes;
  final String? status;

  Clinic({
    required this.id,
    required this.name,
    required this.address,
    this.latitude,
    this.longitude,
    required this.services,
    this.queueCount,
    this.waitMinutes,
    this.status,
  });

  factory Clinic.fromJson(Map<String, dynamic> j) {
    // services can be List<String> or List<Map>
    List<String> svcs = [];
    if (j['services'] is List) {
      for (final s in j['services']) {
        if (s is String) svcs.add(s);
        else if (s is Map) svcs.add(s['name']?.toString() ?? '');
      }
    }

    final loc = j['location'];
    double? lat, lng;
    if (loc is Map) {
      final coords = loc['coordinates'];
      if (coords is List && coords.length == 2) {
        lng = (coords[0] as num?)?.toDouble();
        lat = (coords[1] as num?)?.toDouble();
      }
    }

    return Clinic(
      id: j['_id'] ?? j['id'] ?? '',
      name: j['name'] ?? '',
      address: j['address'] ?? '',
      latitude: lat,
      longitude: lng,
      services: svcs,
      queueCount: (j['queueCount'] ?? j['currentQueue'] ?? 0) as int?,
      waitMinutes: (j['estimatedWait'] ?? j['waitMinutes'] ?? 0) as int?,
      status: j['status']?.toString(),
    );
  }
}

class ClinicService {
  static Future<List<Clinic>> getDirectory() async {
    try {
      final list = await ApiService.getClinicDirectory();
      return list.map((j) => Clinic.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('ClinicService.getDirectory error: \$e');
      rethrow;
    }
  }

  static Future<List<Clinic>> getRecommended() async {
    try {
      final list = await ApiService.getRecommendedClinics();
      return list.map((j) => Clinic.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('ClinicService.getRecommended error: \$e');
      rethrow;
    }
  }
}
