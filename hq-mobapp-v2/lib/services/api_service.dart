import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://192.168.1.49:4000/api';
  static String? _token;

  static Future<void> ensureMockAuth() async {
    if (_token != null) return;
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/login'),
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
        print('Mock auth failed: ${res.body}');
      }
    } catch (e) {
      print('Mock auth error: $e');
    }
  }

  static Future<Map<String, dynamic>> joinQueue({
    required String clinicId,
    required String serviceName,
  }) async {
    await ensureMockAuth();
    if (_token == null) throw Exception('Auth failed. Cannot join queue.');

    final res = await http.post(
      Uri.parse('$baseUrl/queues/join'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_token'
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
      throw Exception('Failed to join queue: ${res.body}');
    }
  }

  static Future<Map<String, dynamic>> getMyQueueStatus() async {
    await ensureMockAuth();
    if (_token == null) throw Exception('Auth failed');

    final res = await http.get(
      Uri.parse('$baseUrl/queues/my-status'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_token'
      },
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body);
    } else {
      throw Exception('Failed to get queue status: ${res.statusCode}');
    }
  }

  static Future<bool> cancelQueue(String id) async {
    await ensureMockAuth();
    if (_token == null) throw Exception('Auth failed');

    final res = await http.put(
      Uri.parse('$baseUrl/queues/$id/cancel'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_token'
      },
    );

    return res.statusCode == 200 || res.statusCode == 201;
  }
}
