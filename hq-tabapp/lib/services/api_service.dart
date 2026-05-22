import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StaffApiService {
  static String get baseUrl => dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:4000';
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'hq_staff_jwt';

  static Future<void> saveToken(String t) => _storage.write(key: _tokenKey, value: t);
  static Future<String?> getToken() => _storage.read(key: _tokenKey);
  static Future<void> deleteToken() => _storage.delete(key: _tokenKey);

  static Future<Map<String, String>> _authHeaders() async {
    final token = await getToken();
    return {'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token'};
  }

  static Uri _uri(String path) => Uri.parse('$baseUrl$path');

  static dynamic _handle(http.Response res) {
    final body = jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    throw StaffApiException(body['message'] ?? 'Request failed (${res.statusCode})');
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(_uri('/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}));
    return _handle(res) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getMe() async {
    final res = await http.get(_uri('/api/auth/me'), headers: await _authHeaders());
    return _handle(res) as Map<String, dynamic>;
  }

  // ── Queue ─────────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getQueueEntries({String? clinicId, String? status}) async {
    final params = <String, String>{};
    if (clinicId != null) params['clinicId'] = clinicId;
    if (status != null) params['status'] = status;
    final uri = Uri.parse('$baseUrl/api/queues').replace(queryParameters: params);
    final res = await http.get(uri, headers: await _authHeaders());
    return _handle(res) as List<dynamic>;
  }

  static Future<Map<String, dynamic>> getQueueMetrics(String clinicId) async {
    final uri = Uri.parse('$baseUrl/api/queues/metrics').replace(queryParameters: {'clinicId': clinicId});
    final res = await http.get(uri, headers: await _authHeaders());
    return _handle(res) as Map<String, dynamic>;
  }

  static Future<void> callPatient(String entryId) async {
    final res = await http.put(_uri('/api/queues/$entryId/call'), headers: await _authHeaders());
    _handle(res);
  }

  static Future<void> completePatient(String entryId) async {
    final res = await http.put(_uri('/api/queues/$entryId/complete'), headers: await _authHeaders());
    _handle(res);
  }

  static Future<void> skipPatient(String entryId) async {
    final res = await http.put(_uri('/api/queues/$entryId/skip'), headers: await _authHeaders());
    _handle(res);
  }

  static Future<void> markNoShow(String entryId) async {
    final res = await http.put(_uri('/api/queues/$entryId/no-show'), headers: await _authHeaders());
    _handle(res);
  }

  static Future<Map<String, dynamic>> addWalkIn({
    required String clinicId,
    required String patientName,
    required String serviceName,
    String? patientPhone,
    String? patientType,
    String? notes,
  }) async {
    final res = await http.post(_uri('/api/queues/add-walkin'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'clinicId': clinicId,
        'patientName': patientName,
        'serviceName': serviceName,
        'patientPhone': patientPhone,
        'patientType': patientType ?? 'Regular',
        'notes': notes,
      }));
    return _handle(res) as Map<String, dynamic>;
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  static Future<List<dynamic>> getTodayAppointments(String clinicId) async {
    final uri = Uri.parse('$baseUrl/api/appointments/today').replace(queryParameters: {'clinicId': clinicId});
    final res = await http.get(uri, headers: await _authHeaders());
    return _handle(res) as List<dynamic>;
  }

  static Future<void> updateAppointmentStatus(String id, String status) async {
    final res = await http.put(_uri('/api/appointments/$id/status'),
      headers: await _authHeaders(),
      body: jsonEncode({'status': status}));
    _handle(res);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getFacilityStats(String clinicId) async {
    final uri = Uri.parse('$baseUrl/api/dashboard/facility').replace(queryParameters: {'clinicId': clinicId});
    final res = await http.get(uri, headers: await _authHeaders());
    return _handle(res) as Map<String, dynamic>;
  }
}

class StaffApiException implements Exception {
  final String message;
  StaffApiException(this.message);
  @override
  String toString() => message;
}
