import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiConfig {
  // ✏️ Change this to your PC's local IP before running on a real device.
  // Run: ipconfig (Windows) → IPv4 Address under your WiFi adapter.
  // Make sure your phone and PC are on the SAME WiFi network.
  static const String baseUrl = 'http://192.168.1.100:4000';
  static const Duration timeout = Duration(seconds: 15);
}

class ApiService {
  static const _storage  = FlutterSecureStorage();
  static const _tokenKey = 'hq_jwt_token';

  static Future<void>    saveToken(String t) => _storage.write(key: _tokenKey, value: t);
  static Future<String?> getToken()          => _storage.read(key: _tokenKey);
  static Future<void>    deleteToken()       => _storage.delete(key: _tokenKey);

  static Future<Map<String, String>> _authHeaders() async {
    final t = await getToken();
    return {
      'Content-Type': 'application/json',
      if (t != null) 'Authorization': 'Bearer $t',
    };
  }

  // IMPORTANT: String interpolation must use double quotes so $ works correctly
  static Uri _uri(String path) => Uri.parse(ApiConfig.baseUrl + path);

  static dynamic _parse(http.Response res) {
    final body = jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    throw ApiException(
        (body is Map ? body['message'] : null) ?? 'Error ${res.statusCode}');
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    final res = await http
        .post(
          _uri('/api/auth/register'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'fullName': fullName,
            'email': email,
            'phone': phone,
            'password': password,
          }),
        )
        .timeout(ApiConfig.timeout,
            onTimeout: () => throw ApiException('Connection timed out. Is the server running?'));
    return _parse(res) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final res = await http
        .post(
          _uri('/api/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email, 'password': password}),
        )
        .timeout(ApiConfig.timeout,
            onTimeout: () => throw ApiException('Connection timed out.'));
    return _parse(res) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getMe() async {
    final res = await http
        .get(_uri('/api/auth/me'), headers: await _authHeaders())
        .timeout(ApiConfig.timeout,
            onTimeout: () => throw ApiException('Connection timed out.'));
    return _parse(res) as Map<String, dynamic>;
  }

  // ── CLINICS ───────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getClinics() async {
    try {
      final res = await http
          .get(_uri('/api/clinics'), headers: await _authHeaders())
          .timeout(ApiConfig.timeout);
      final data = _parse(res);
      return data is List ? data : (data['clinics'] ?? data['data'] ?? []);
    } catch (_) {
      return [];
    }
  }

  static Future<List<dynamic>> getClinicDirectory() async {
    try {
      final res = await http
          .get(_uri('/api/clinics/directory'), headers: await _authHeaders())
          .timeout(ApiConfig.timeout);
      final data = _parse(res);
      return data is List ? data : [];
    } catch (_) {
      return [];
    }
  }

  // ── QUEUE ─────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> joinQueue({
    required String clinicId,
    required String serviceName,
    String? notes,
    bool priority = false,
  }) async {
    final res = await http
        .post(
          _uri('/api/queues/join'),
          headers: await _authHeaders(),
          body: jsonEncode({
            'clinicId': clinicId,
            'serviceName': serviceName,
            if (notes != null) 'notes': notes,
            'priority': priority,
          }),
        )
        .timeout(ApiConfig.timeout,
            onTimeout: () => throw ApiException('Connection timed out.'));
    return _parse(res) as Map<String, dynamic>;
  }

  static Future<dynamic> getMyQueueStatus() async {
    try {
      final res = await http
          .get(_uri('/api/queues/my-status'), headers: await _authHeaders())
          .timeout(ApiConfig.timeout);
      return _parse(res);
    } catch (_) {
      return {};
    }
  }

  static Future<void> cancelQueue(String id) async {
    final res = await http
        .put(_uri('/api/queues/' + id + '/cancel'), headers: await _authHeaders())
        .timeout(ApiConfig.timeout,
            onTimeout: () => throw ApiException('Timeout'));
    _parse(res);
  }

  // ── APPOINTMENTS ──────────────────────────────────────────────────────────
  static Future<List<dynamic>> getMyAppointments() async {
    try {
      final res = await http
          .get(_uri('/api/appointments/my'), headers: await _authHeaders())
          .timeout(ApiConfig.timeout);
      final data = _parse(res);
      return data is List ? data : [];
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> bookAppointment({
    required String clinicId,
    required String serviceName,
    required String appointmentDate,
    required String timeSlot,
    String? notes,
  }) async {
    final res = await http
        .post(
          _uri('/api/appointments'),
          headers: await _authHeaders(),
          body: jsonEncode({
            'clinicId': clinicId,
            'serviceName': serviceName,
            'appointmentDate': appointmentDate,
            'timeSlot': timeSlot,
            if (notes != null) 'notes': notes,
          }),
        )
        .timeout(ApiConfig.timeout,
            onTimeout: () => throw ApiException('Connection timed out.'));
    return _parse(res) as Map<String, dynamic>;
  }

  static Future<void> cancelAppointment(String id, {String? reason}) async {
    final res = await http
        .put(
          _uri('/api/appointments/' + id + '/cancel'),
          headers: await _authHeaders(),
          body: jsonEncode({'reason': reason ?? 'Cancelled by patient'}),
        )
        .timeout(ApiConfig.timeout,
            onTimeout: () => throw ApiException('Timeout'));
    _parse(res);
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  static Future<List<dynamic>> getNotifications() async {
    try {
      final res = await http
          .get(_uri('/api/notifications'), headers: await _authHeaders())
          .timeout(ApiConfig.timeout);
      final data = _parse(res);
      return data is List ? data : (data['notifications'] ?? []);
    } catch (_) {
      return [];
    }
  }

  static Future<void> markNotificationRead(String id) async {
    try {
      final res = await http
          .put(_uri('/api/notifications/' + id + '/read'),
              headers: await _authHeaders())
          .timeout(ApiConfig.timeout);
      _parse(res);
    } catch (_) {}
  }

  static Future<void> markAllNotificationsRead() async {
    try {
      final res = await http
          .put(_uri('/api/notifications/read-all'),
              headers: await _authHeaders())
          .timeout(ApiConfig.timeout);
      _parse(res);
    } catch (_) {}
  }

  // ── CHATBOT ───────────────────────────────────────────────────────────────
  static Future<String> sendChatMessage(String message) async {
    try {
      final res = await http
          .post(
            _uri('/api/chatbot/message'),
            headers: await _authHeaders(),
            body: jsonEncode({'message': message}),
          )
          .timeout(ApiConfig.timeout);
      final data = _parse(res) as Map<String, dynamic>;
      return data['response']?.toString() ?? 'I could not understand that.';
    } catch (_) {
      return 'Sorry, I am having trouble connecting. Please try again.';
    }
  }

  // ── PROFILE ───────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> updateProfile(
      Map<String, dynamic> data) async {
    final res = await http
        .put(
          _uri('/api/users/profile'),
          headers: await _authHeaders(),
          body: jsonEncode(data),
        )
        .timeout(ApiConfig.timeout,
            onTimeout: () => throw ApiException('Timeout'));
    return _parse(res) as Map<String, dynamic>;
  }
}

class ApiException implements Exception {
  final String message;
  const ApiException(this.message);
  @override
  String toString() => message;
}
