import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart';

class Clinic {
  final String id;
  final String name;
  final String address;
  final double? latitude;
  final double? longitude;
  final List<String> services;

  Clinic(
      {required this.id,
      required this.name,
      required this.address,
      this.latitude,
      this.longitude,
      this.services = const []});

  factory Clinic.fromJson(Map<String, dynamic> json) {
    return Clinic(
      id: json['_id'] ?? '',
      name: json['name'] ?? 'Unknown Clinic',
      address: json['address'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      services: (json['services'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

class ClinicService {
  static Future<List<Clinic>> getDirectory() async {
    final response =
        await http.get(Uri.parse('${ApiService.baseUrl}/clinics/directory'));

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Clinic.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load clinics');
    }
  }
}
