import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Central API service for hq-mobapp-v2.
/// All calls use the JWT stored after a real login via AppState.
class ApiService {
  // For emulator: http://10.0.2.2:4000/api
  // For physical device: http://<your-local-IP>:4000/api
  static const String baseUrl = 'http://10.0.2.2:4000/api';

  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'hq_jwt_token';

  // ── Token management ────────────────────────────────────────────

  static Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  static Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  static Future<Map<String, String>> _authHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer \$token',
    };
  }

  // ── Auth ────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('\$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data['token'] != null) {
        await saveToken(data['token']);
      }
      return data;
    }
    final err = jsonDecode(res.body);
    throw Exception(err['message'] ?? 'Login failed');
  }

  static Future<Map<String, dynamic>> register(Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('\$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (res.statusCode == 200 || res.statusCode == 201) {
      final data = jsonDecode(res.body);
      if (data['token'] != null) await saveToken(data['token']);
      return data;
    }
    final err = jsonDecode(res.body);
    throw Exception(err['message'] ?? 'Registration failed');
  }

  static Future<Map<String, dynamic>> getMe() async {
    final res = await http.get(
      Uri.parse('\$baseUrl/auth/me'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to fetch user profile');
  }

  // ── Clinics ─────────────────────────────────────────────────────

  static Future<List<dynamic>> getClinicDirectory() async {
    final res = await http.get(Uri.parse('\$baseUrl/clinics/directory'));
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['clinics'] ?? data['data'] ?? data;
    }
    throw Exception('Failed to load clinics');
  }

  static Future<List<dynamic>> getRecommendedClinics() async {
    final headers = await _authHeaders();
    final res = await http.get(Uri.parse('\$baseUrl/clinics/recommend'), headers: headers);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['clinics'] ?? data['data'] ?? data;
    }
    throw Exception('Failed to load recommendations');
  }

  // ── Queue ───────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> joinQueue({
    required String clinicId,
    required String serviceName,
    String? notes,
  }) async {
    final res = await http.post(
      Uri.parse('\$baseUrl/queues/join'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'clinicId': clinicId,
        'serviceName': serviceName,
        if (notes != null) 'notes': notes,
      }),
    );
    if (res.statusCode == 200 || res.statusCode == 201) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw Exception(err['message'] ?? 'Failed to join queue');
  }

  static Future<Map<String, dynamic>> getMyQueueStatus() async {
    final res = await http.get(
      Uri.parse('\$baseUrl/queues/my-status'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    if (res.statusCode == 404) return {};  // no active queue — not an error
    throw Exception('Failed to get queue status: \${res.statusCode}');
  }

  static Future<bool> cancelQueue(String id) async {
    final res = await http.put(
      Uri.parse('\$baseUrl/queues/\$id/cancel'),
      headers: await _authHeaders(),
    );
    return res.statusCode == 200 || res.statusCode == 201;
  }

  // ── Appointments ────────────────────────────────────────────────

  static Future<List<dynamic>> getMyAppointments() async {
    final res = await http.get(
      Uri.parse('\$baseUrl/appointments/my'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['appointments'] ?? data['data'] ?? data;
    }
    throw Exception('Failed to load appointments');
  }

  static Future<Map<String, dynamic>> bookAppointment(Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('\$baseUrl/appointments'),
      headers: await _authHeaders(),
      body: jsonEncode(body),
    );
    if (res.statusCode == 200 || res.statusCode == 201) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw Exception(err['message'] ?? 'Failed to book appointment');
  }

  static Future<bool> cancelAppointment(String id) async {
    final res = await http.put(
      Uri.parse('\$baseUrl/appointments/\$id/cancel'),
      headers: await _authHeaders(),
    );
    return res.statusCode == 200 || res.statusCode == 201;
  }

  static Future<List<dynamic>> getAvailableSlots({
    required String clinicId,
    required String date,
  }) async {
    final headers = await _authHeaders();
    final res = await http.get(
      Uri.parse('\$baseUrl/appointments/available-slots?clinicId=\$clinicId&date=\$date'),
      headers: headers,
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['slots'] ?? data['data'] ?? data;
    }
    throw Exception('Failed to load slots');
  }

  // ── Chatbot ─────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> sendChatMessage(String message) async {
    final res = await http.post(
      Uri.parse('\$baseUrl/chatbot/message'),
      headers: await _authHeaders(),
      body: jsonEncode({'message': message}),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Chatbot error');
  }

  // ── Notifications ───────────────────────────────────────────────

  static Future<List<dynamic>> getNotifications() async {
    final res = await http.get(
      Uri.parse('\$baseUrl/notifications'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['notifications'] ?? data['data'] ?? data;
    }
    throw Exception('Failed to load notifications');
  }

  // ── Profile ─────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getProfile() async {
    final res = await http.get(
      Uri.parse('\$baseUrl/users/profile'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['user'] ?? data;
    }
    throw Exception('Failed to load profile');
  }

  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
    final res = await http.put(
      Uri.parse('\$baseUrl/users/profile'),
      headers: await _authHeaders(),
      body: jsonEncode(body),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      return data['user'] ?? data;
    }
    throw Exception('Failed to update profile');
  }
}
