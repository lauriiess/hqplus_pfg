import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static String get baseUrl => dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:4000';
  static const _storage  = FlutterSecureStorage();
  static const _tokenKey = 'hq_jwt_token';

  // ── Token management ───────────────────────────────────────────────────────
  static Future<void>    saveToken(String token) => _storage.write(key: _tokenKey, value: token);
  static Future<String?> getToken()              => _storage.read(key: _tokenKey);
  static Future<void>    deleteToken()           => _storage.delete(key: _tokenKey);

  // ── Headers ────────────────────────────────────────────────────────────────
  static Future<Map<String, String>> _authHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Uri _uri(String path) => Uri.parse('$baseUrl$path');

  static dynamic _handleResponse(http.Response res) {
    final body = jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    throw ApiException((body as Map<String, dynamic>)['message'] ?? 'Request failed (${res.statusCode})');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════════════════════════════════════

  static Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    final res = await http.post(
      _uri('/api/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'fullName': fullName, 'email': email, 'phone': phone, 'password': password}),
    );
    return _handleResponse(res) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final res = await http.post(
      _uri('/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    return _handleResponse(res) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getMe() async {
    final res = await http.get(_uri('/api/auth/me'), headers: await _authHeaders());
    return _handleResponse(res) as Map<String, dynamic>;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLINICS
  // ══════════════════════════════════════════════════════════════════════════

  static Future<List<dynamic>> getClinicDirectory() async {
    final res = await http.get(_uri('/api/clinics/directory'), headers: await _authHeaders());
    final data = _handleResponse(res);
    return data is List ? data : [];
  }

  static Future<List<dynamic>> getRecommendations({
    double? lat, double? lng, String? service, String? type,
  }) async {
    final params = <String, String>{};
    if (lat     != null) params['lat']     = lat.toString();
    if (lng     != null) params['lng']     = lng.toString();
    if (service != null) params['service'] = service;
    if (type    != null) params['type']    = type;
    final uri = Uri.parse('$baseUrl/api/clinics/recommend').replace(queryParameters: params);
    final res  = await http.get(uri, headers: await _authHeaders());
    final data = _handleResponse(res);
    return data is List ? data : [];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUEUE
  // ══════════════════════════════════════════════════════════════════════════

  static Future<Map<String, dynamic>> joinQueue({
    required String clinicId,
    required String serviceName,
    String? serviceId,
    String? notes,
  }) async {
    final res = await http.post(
      _uri('/api/queues/join'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'clinicId':    clinicId,
        'serviceName': serviceName,
        if (serviceId != null) 'serviceId': serviceId,
        if (notes     != null) 'notes':     notes,
      }),
    );
    return _handleResponse(res) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getMyQueueStatus() async {
    final res = await http.get(_uri('/api/queues/my-status'), headers: await _authHeaders());
    return _handleResponse(res) as Map<String, dynamic>;
  }

  static Future<void> cancelQueueEntry(String entryId) async {
    final res = await http.put(
      _uri('/api/queues/$entryId/cancel'),
      headers: await _authHeaders(),
    );
    _handleResponse(res);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // APPOINTMENTS
  // ══════════════════════════════════════════════════════════════════════════

  static Future<List<dynamic>> getMyAppointments() async {
    final res  = await http.get(_uri('/api/appointments/my'), headers: await _authHeaders());
    final data = _handleResponse(res);
    return data is List ? data : (data['appointments'] ?? []);
  }

  static Future<List<dynamic>> getAvailableSlots({
    required String clinicId,
    required String date,
    String? serviceId,
  }) async {
    final params = <String, String>{'clinicId': clinicId, 'date': date};
    if (serviceId != null) params['serviceId'] = serviceId;
    final uri = Uri.parse('$baseUrl/api/appointments/timeslots').replace(queryParameters: params);
    final res  = await http.get(uri, headers: await _authHeaders());
    final data = _handleResponse(res);
    return data is List ? data : [];
  }

  static Future<Map<String, dynamic>> bookAppointment({
    required String clinicId,
    required String serviceName,
    String? serviceId,
    required String appointmentDate,
    required String timeSlot,
    String? endTime,
    String? reason,
    String? notes,
  }) async {
    final res = await http.post(
      _uri('/api/appointments'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'clinicId':       clinicId,
        'serviceName':    serviceName,
        if (serviceId       != null) 'serviceId':       serviceId,
        'appointmentDate':  appointmentDate,
        'timeSlot':         timeSlot,
        if (endTime  != null) 'endTime':  endTime,
        if (reason   != null) 'reason':   reason,
        if (notes    != null) 'notes':    notes,
      }),
    );
    return _handleResponse(res) as Map<String, dynamic>;
  }

  static Future<void> cancelAppointment(String id, {String? reason}) async {
    final res = await http.put(
      _uri('/api/appointments/$id/cancel'),
      headers: await _authHeaders(),
      body: jsonEncode({'reason': reason ?? 'Cancelled by patient'}),
    );
    _handleResponse(res);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════════════════════════════════════════

  static Future<List<dynamic>> getNotifications() async {
    final res  = await http.get(_uri('/api/notifications'), headers: await _authHeaders());
    final data = _handleResponse(res);
    return data is List ? data : (data['notifications'] ?? []);
  }

  static Future<void> markNotificationRead(String id) async {
    final res = await http.put(_uri('/api/notifications/$id/read'), headers: await _authHeaders());
    _handleResponse(res);
  }

  static Future<void> markAllNotificationsRead() async {
    final res = await http.put(_uri('/api/notifications/read-all'), headers: await _authHeaders());
    _handleResponse(res);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHATBOT
  // ══════════════════════════════════════════════════════════════════════════

  /// Returns the bot reply string (server returns { response: "..." })
  static Future<String> sendChatMessage(String message) async {
    final res  = await http.post(
      _uri('/api/chatbot/message'),
      headers: await _authHeaders(),
      body: jsonEncode({'message': message}),
    );
    final data = _handleResponse(res) as Map<String, dynamic>;
    // Server returns { response: "..." }
    return data['response']?.toString() ??
           (data['replies'] as List?)?.map((r) => r.toString()).join('\n') ??
           'Sorry, I could not process your request.';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PATIENT PROFILE
  // ══════════════════════════════════════════════════════════════════════════

  static Future<Map<String, dynamic>> getMyPatientProfile() async {
    // Falls back to /api/auth/me if patient profile endpoint not available
    try {
      final res  = await http.get(_uri('/api/patients/me'), headers: await _authHeaders());
      return _handleResponse(res) as Map<String, dynamic>;
    } catch (_) {
      return await getMe();
    }
  }

  static Future<Map<String, dynamic>> updateMyPatientProfile(Map<String, dynamic> data) async {
    final res = await http.put(
      _uri('/api/patients/me'),
      headers: await _authHeaders(),
      body: jsonEncode(data),
    );
    return _handleResponse(res) as Map<String, dynamic>;
  }
}

class ApiException implements Exception {
  final String message;
  const ApiException(this.message);
  @override
  String toString() => message;
}
