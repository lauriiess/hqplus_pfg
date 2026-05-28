const fs = require('fs');
const api = import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://192.168.1.49:4000/api';
  static String? _token;

  static Future<void> ensureMockAuth() async {
    if (_token != null) return;
    try {
      final res = await http.post(
        Uri.parse('\\\/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': 'patient@hqplus.com',
          'password': 'Patient@1234'
        }),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        _token = data['token'];
      } else {
        print('Mock auth failed: \\\');
      }
    } catch (e) {
      print('Mock auth error: \\\');
    }
  }

  static Future<Map<String, dynamic>> joinQueue({
    required String clinicId,
    required String serviceName,
  }) async {
    await ensureMockAuth();
    if (_token == null) throw Exception('Auth failed. Cannot join queue.');

    final res = await http.post(
      Uri.parse('\\\/queues/join'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer \\\'
      },
      body: jsonEncode({
        'clinicId': clinicId,
        'serviceName': serviceName,
        'notes': 'Joined via mobapp-v2'
      }),
    );
    
    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body);
    } else {
      throw Exception('Failed to join queue: \\\');
    }
  }
}
;
fs.writeFileSync('lib/services/api_service.dart', api.replace(/\\\\\\\$/g, '\$'));
