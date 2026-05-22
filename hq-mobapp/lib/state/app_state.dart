import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AppState extends ChangeNotifier {
  AppUser? _currentUser;
  bool _loading = false;
  String? _error;

  AppUser? get currentUser => _currentUser;
  bool get isLoggedIn => _currentUser != null;
  bool get loading => _loading;
  String? get error => _error;

  AppState() {
    _restoreSession();
  }

  void _setLoading(bool v) { _loading = v; notifyListeners(); }
  void _setError(String? v) { _error = v; notifyListeners(); }
  void clearError() { _error = null; notifyListeners(); }

  // ── Restore session from local cache ──────────────────────────────────────
  Future<void> _restoreSession() async {
    final token = await ApiService.getToken();
    if (token == null) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('hq_user');
      if (raw != null) {
        _currentUser = AppUser.fromJson(jsonDecode(raw));
        notifyListeners();
      }
      // Verify token is still valid
      final data = await ApiService.getMe();
      _currentUser = AppUser.fromJson(data['user']);
      await _saveUserToPrefs(_currentUser!);
      notifyListeners();
    } catch (_) {
      // Token expired — clear session
      await logout();
    }
  }

  Future<void> _saveUserToPrefs(AppUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('hq_user', jsonEncode(user.toJson()));
  }

  // ── Register ─────────────────────────────────────────────────────────────
  Future<void> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      final data = await ApiService.register(
        fullName: fullName, email: email, phone: phone, password: password,
      );
      await ApiService.saveToken(data['token']);
      _currentUser = AppUser.fromJson(data['user']);
      await _saveUserToPrefs(_currentUser!);
      notifyListeners();
    } on ApiException catch (e) {
      _setError(e.message);
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  Future<void> login({required String email, required String password}) async {
    _setLoading(true);
    _setError(null);
    try {
      final data = await ApiService.login(email: email, password: password);
      await ApiService.saveToken(data['token']);
      _currentUser = AppUser.fromJson(data['user']);
      await _saveUserToPrefs(_currentUser!);
      notifyListeners();
    } on ApiException catch (e) {
      _setError(e.message);
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  Future<void> logout() async {
    await ApiService.deleteToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('hq_user');
    _currentUser = null;
    _error = null;
    notifyListeners();
  }
}
