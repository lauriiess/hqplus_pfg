import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/appointment_models.dart';
import '../models/queue_models.dart';
import '../models/chat_models.dart';
import '../models/user_models.dart';
import '../models/clinic_models.dart';
import '../data/clinic_data.dart';
import '../services/api_service.dart';

class AppState extends ChangeNotifier {
  static const _storage = FlutterSecureStorage();

  // ── Auth ──────────────────────────────────────────────────────────────────
  AppUser? _currentUser;
  bool _loading = false;
  String? _authError;

  AppUser? get currentUser => _currentUser;
  bool get isLoggedIn => _currentUser != null;
  bool get loading => _loading;
  String? get authError => _authError;

  Future<void> tryAutoLogin() async {
    final token = await ApiService.getToken();
    if (token == null) return;
    try {
      final data = await ApiService.getMe();
      _currentUser = AppUser.fromJson(data['user'] ?? data, token: token);
      await _loadData();
      notifyListeners();
    } catch (_) {
      await ApiService.deleteToken();
    }
  }

  Future<bool> login({required String email, required String password}) async {
    _loading = true;
    _authError = null;
    notifyListeners();
    try {
      final data = await ApiService.login(email: email, password: password);
      final token = data['token'] as String;
      await ApiService.saveToken(token);
      _currentUser = AppUser.fromJson(data['user'] ?? data, token: token);
      await _loadData();
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _authError = e.toString();
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    _loading = true;
    _authError = null;
    notifyListeners();
    try {
      final data = await ApiService.register(
          fullName: fullName, email: email, phone: phone, password: password);
      final token = data['token'] as String;
      await ApiService.saveToken(token);
      _currentUser = AppUser.fromJson(data['user'] ?? data, token: token);
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _authError = e.toString();
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await ApiService.deleteToken();
    _currentUser = null;
    _appointments.clear();
    _queues.clear();
    _messages.clear();
    notifyListeners();
  }

  void updateCurrentUserProfile({
    String? fullName, String? phone, String? age,
    String? patientType, String? philHealthNumber, String? hmoNumber,
  }) {
    if (_currentUser == null) return;
    _currentUser = _currentUser!.copyWith(
      fullName: fullName, phone: phone, age: age,
      patientType: patientType,
      philHealthNumber: philHealthNumber,
      hmoNumber: hmoNumber,
    );
    notifyListeners();
  }

  // ── Clinics ───────────────────────────────────────────────────────────────
  List<Clinic> _clinics = List.from(staticClinics);
  Clinic? _selectedClinic;

  List<Clinic> get clinics => _clinics;
  Clinic? get selectedClinic => _selectedClinic;

  void selectClinic(Clinic c) {
    _selectedClinic = c;
    notifyListeners();
  }

  Future<void> fetchClinics() async {
    try {
      final raw = await ApiService.getClinics();
      if (raw.isNotEmpty) {
        _clinics = raw.map((j) => Clinic.fromJson(j as Map<String, dynamic>)).toList();
        notifyListeners();
      }
    } catch (_) {}
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  final List<Appointment> _appointments = [];

  List<Appointment> get appointments => List.unmodifiable(_appointments);

  List<Appointment> get upcomingAppointments => _appointments
      .where((a) =>
          a.status == AppointmentStatus.pending ||
          a.status == AppointmentStatus.confirmed)
      .toList();

  List<Appointment> get pastAppointments => _appointments
      .where((a) =>
          a.status == AppointmentStatus.completed ||
          a.status == AppointmentStatus.cancelled)
      .toList();

  Future<void> fetchAppointments() async {
    try {
      final raw = await ApiService.getMyAppointments();
      _appointments
        ..clear()
        ..addAll(
            raw.map((j) => Appointment.fromJson(j as Map<String, dynamic>)));
      notifyListeners();
    } catch (_) {}
  }

  void addAppointment(Appointment a) {
    // Optimistically add immediately so UI updates without waiting
    _appointments.add(a);
    notifyListeners();
    // Then sync with server to get the real persisted record
    fetchAppointments();
  }

  Future<void> cancelAppointment(String id) async {
    try {
      await ApiService.cancelAppointment(id);
      final i = _appointments.indexWhere((a) => a.id == id);
      if (i != -1) {
        _appointments[i] =
            _appointments[i].copyWith(status: AppointmentStatus.cancelled);
        notifyListeners();
      }
    } catch (_) {}
  }

  // ── Queue ─────────────────────────────────────────────────────────────────
  final List<QueueEntry> _queues = [];

  List<QueueEntry> get queues => List.unmodifiable(_queues);

  List<QueueEntry> get activeQueues => _queues
      .where((q) =>
          q.status == QueueStatus.waiting ||
          q.status == QueueStatus.inProgress)
      .toList();

  QueueEntry? get currentQueue =>
      activeQueues.isNotEmpty ? activeQueues.first : null;

  Future<void> fetchQueueStatus() async {
    try {
      final data = await ApiService.getMyQueueStatus();
      _queues.clear(); // always clear first — server is the source of truth
      if (data is Map) {
        if (data['active'] == true && data['entry'] != null) {
          _queues.add(QueueEntry.fromJson(data['entry'] as Map<String, dynamic>));
        }
        // if active == false, list stays empty — queue was cancelled/done
      } else if (data is List) {
        _queues.addAll(
            data.map((j) => QueueEntry.fromJson(j as Map<String, dynamic>)));
      }
      notifyListeners();
    } catch (_) {}
  }

  void addQueueFromJoinResult(QueueJoinResult r) {
    final entry = QueueEntry(
      queueNumber: r.queueNumber,
      queueType: r.queueType,
      clinicId: r.clinicId,
      clinicName: r.clinicName,
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      joinedAt: r.joinedAt,
      position: r.position,
      totalAhead: r.totalAhead,
      estimatedWaitTimeMinutes: r.estimatedWaitTimeMinutes,
      status: QueueStatus.waiting,
    );
    _queues.add(entry);
    notifyListeners();
  }

  Future<void> leaveQueue(String queueNumber) async {
    final i = _queues.indexWhere((q) => q.queueNumber == queueNumber);
    if (i == -1) return;
    final q = _queues[i];

    // Remove immediately from local list so UI feels instant
    _queues.removeAt(i);
    notifyListeners();

    // Cancel on server using the queue entry id if available, else queueNumber
    try {
      final entryId = q.entryId ?? q.queueNumber;
      await ApiService.cancelQueue(entryId);
    } catch (_) {
      // If cancel fails silently, re-fetch to sync with server truth
      await fetchQueueStatus();
    }
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  final List<ChatMessage> _messages = [];
  List<ChatMessage> get messages => List.unmodifiable(_messages);

  void seedChatIfEmpty() {
    if (_messages.isNotEmpty) return;
    _messages.add(ChatMessage(
      id: '0',
      sender: ChatSender.bot,
      message:
          "Hi! I'm your HealthQueue+ assistant. I can help with queue status, booking appointments, or clinic information. What can I help you with?",
      timestamp: DateTime.now(),
      quickReplies: [
        'Check my queue',
        'Book appointment',
        'Find a clinic',
        'My appointments'
      ],
    ));
    notifyListeners();
  }

  Future<void> sendMessage(String text) async {
    _messages.add(ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sender: ChatSender.user,
      message: text,
      timestamp: DateTime.now(),
    ));
    notifyListeners();

    final reply = await ApiService.sendChatMessage(text);
    _messages.add(ChatMessage(
      id: (DateTime.now().millisecondsSinceEpoch + 1).toString(),
      sender: ChatSender.bot,
      message: reply,
      timestamp: DateTime.now(),
    ));
    notifyListeners();
  }

  Future<void> _loadData() async {
    await Future.wait(
        [fetchClinics(), fetchAppointments(), fetchQueueStatus()]);
  }
}
