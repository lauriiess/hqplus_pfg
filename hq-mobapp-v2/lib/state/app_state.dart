import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../models/appointment_models.dart';
import '../models/queue_models.dart';
import '../models/chat_models.dart';
import '../models/user_models.dart';

class AppState extends ChangeNotifier {
  /* ----------------------------------------------------------------
     AUTH  — backed by the real hq-server API
  ---------------------------------------------------------------- */
  AppUser? _currentUser;
  bool _isAuthLoading = false;

  AppUser? get currentUser => _currentUser;
  bool get isLoggedIn => _currentUser != null;
  bool get isAuthLoading => _isAuthLoading;

  /// Login via real server. Saves JWT to secure storage.
  Future<void> login({required String identifier, required String password}) async {
    _isAuthLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.login(identifier, password);
      final u = data['user'] ?? data;
      _currentUser = AppUser(
        id: u['_id'] ?? u['id'] ?? '',
        fullName: u['fullName'] ?? u['name'] ?? '',
        email: u['email'] ?? '',
        phone: u['phone'] ?? '',
        dob: DateTime.tryParse(u['dateOfBirth'] ?? '') ?? DateTime(2000),
        password: '',
        patientType: u['patientType'] ?? 'Regular Patient',
        patientId: u['patientId'] ?? '',
        age: u['age']?.toString() ?? '',
        philHealthNumber: u['philHealthNumber'] ?? '',
        hmoNumber: u['hmoNumber'] ?? '',
      );
      // Fetch initial data after login
      await Future.wait([
        fetchAppointments(),
        fetchQueueStatus(),
      ]);
    } finally {
      _isAuthLoading = false;
      notifyListeners();
    }
  }

  /// Register via real server. Auto-logs in on success.
  Future<void> registerUser({
    required String fullName,
    required String email,
    required String phone,
    required DateTime dob,
    required String password,
  }) async {
    _isAuthLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.register({
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'dateOfBirth': dob.toIso8601String(),
        'password': password,
        'role': 'patient',
      });
      final u = data['user'] ?? data;
      _currentUser = AppUser(
        id: u['_id'] ?? u['id'] ?? '',
        fullName: u['fullName'] ?? fullName,
        email: u['email'] ?? email,
        phone: u['phone'] ?? phone,
        dob: dob,
        password: '',
        patientType: 'Regular Patient',
        patientId: u['patientId'] ?? '',
        age: '',
        philHealthNumber: '',
        hmoNumber: '',
      );
    } finally {
      _isAuthLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await ApiService.clearToken();
    _currentUser = null;
    _appointments = [];
    _currentQueue = null;
    _chatMessages = [];
    notifyListeners();
  }

  Future<void> updateCurrentUserProfile({
    String? fullName,
    String? phone,
    String? age,
    String? patientType,
    String? philHealthNumber,
    String? hmoNumber,
  }) async {
    if (_currentUser == null) return;
    final body = <String, dynamic>{};
    if (fullName != null) body['fullName'] = fullName;
    if (phone != null) body['phone'] = phone;
    if (age != null) body['age'] = age;
    if (patientType != null) body['patientType'] = patientType;
    if (philHealthNumber != null) body['philHealthNumber'] = philHealthNumber;
    if (hmoNumber != null) body['hmoNumber'] = hmoNumber;

    try {
      final updated = await ApiService.updateProfile(body);
      _currentUser = _currentUser!.copyWith(
        fullName: updated['fullName'] ?? _currentUser!.fullName,
        phone: updated['phone'] ?? _currentUser!.phone,
        age: updated['age']?.toString() ?? _currentUser!.age,
        patientType: updated['patientType'] ?? _currentUser!.patientType,
        philHealthNumber: updated['philHealthNumber'] ?? _currentUser!.philHealthNumber,
        hmoNumber: updated['hmoNumber'] ?? _currentUser!.hmoNumber,
      );
      notifyListeners();
    } catch (e) {
      debugPrint('updateProfile error: \$e');
    }
  }

  /* ----------------------------------------------------------------
     APPOINTMENTS — live from server
  ---------------------------------------------------------------- */
  List<Appointment> _appointments = [];
  bool _apptLoading = false;

  List<Appointment> get appointments => List.unmodifiable(_appointments);
  bool get apptLoading => _apptLoading;

  List<Appointment> get upcomingAppointments => _appointments.where((a) =>
    a.status == AppointmentStatus.scheduled ||
    a.status == AppointmentStatus.confirmed ||
    a.status == AppointmentStatus.pending
  ).toList();

  Future<void> fetchAppointments() async {
    _apptLoading = true;
    notifyListeners();
    try {
      final list = await ApiService.getMyAppointments();
      _appointments = list.map((a) => Appointment(
        id: a['_id'] ?? a['id'] ?? '',
        clinicName: a['clinicId']?['name'] ?? a['clinicName'] ?? 'Clinic',
        department: a['serviceId']?['name'] ?? a['department'] ?? a['service'] ?? 'Service',
        doctor: a['staffId']?['fullName'] ?? a['doctor'] ?? '',
        date: DateTime.tryParse(a['appointmentDate'] ?? a['date'] ?? '') ?? DateTime.now(),
        timeLabel: a['timeSlot'] ?? a['timeLabel'] ?? '',
        status: _parseApptStatus(a['status']),
        patientType: PatientType.regular,
        notes: a['notes'] ?? '',
      )).toList();
    } catch (e) {
      debugPrint('fetchAppointments error: \$e');
    } finally {
      _apptLoading = false;
      notifyListeners();
    }
  }

  AppointmentStatus _parseApptStatus(String? s) {
    switch (s) {
      case 'pending':    return AppointmentStatus.pending;
      case 'confirmed':  return AppointmentStatus.confirmed;
      case 'arrived':    return AppointmentStatus.arrived;
      case 'serving':    return AppointmentStatus.serving;
      case 'completed':  return AppointmentStatus.completed;
      case 'cancelled':  return AppointmentStatus.cancelled;
      case 'noShow':     return AppointmentStatus.noShow;
      case 'rescheduled':return AppointmentStatus.rescheduled;
      default:           return AppointmentStatus.pending;
    }
  }

  /// Add locally (optimistic) then refresh from server
  void addAppointment(Appointment appt) {
    _appointments.insert(0, appt);
    notifyListeners();
    fetchAppointments(); // refresh from server
  }

  void updateAppointment(String id, {
    AppointmentStatus? status,
    DateTime? date,
    String? timeLabel,
    String? notes,
  }) {
    final idx = _appointments.indexWhere((a) => a.id == id);
    if (idx == -1) return;
    final old = _appointments[idx];
    _appointments[idx] = Appointment(
      id: old.id,
      clinicName: old.clinicName,
      department: old.department,
      doctor: old.doctor,
      date: date ?? old.date,
      timeLabel: timeLabel ?? old.timeLabel,
      status: status ?? old.status,
      patientType: old.patientType,
      notes: notes ?? old.notes,
    );
    notifyListeners();
    if (status == AppointmentStatus.cancelled) {
      ApiService.cancelAppointment(id).catchError((e) => debugPrint('cancel appt error: \$e'));
    }
    fetchAppointments();
  }

  /* ----------------------------------------------------------------
     QUEUE — live from server
  ---------------------------------------------------------------- */
  QueueEntry? _currentQueue;
  bool _queueLoading = false;

  QueueEntry? get currentQueue => _currentQueue;
  bool get queueLoading => _queueLoading;

  // Support dashboard checking for list
  List<QueueEntry> get activeQueues =>
      _currentQueue == null ? [] : [_currentQueue!];

  Future<void> fetchQueueStatus() async {
    _queueLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.getMyQueueStatus();
      if (data.isEmpty || data['entry'] == null) {
        _currentQueue = null;
      } else {
        final e = data['entry'];
        _currentQueue = QueueEntry(
          id: e['_id'] ?? e['id'] ?? '',
          queueNumber: e['queueNumber']?.toString() ?? 'N/A',
          patientName: _currentUser?.fullName ?? '',
          patientEmail: _currentUser?.email,
          patientPhone: _currentUser?.phone,
          clinicName: e['clinicId']?['name'] ?? 'Clinic',
          serviceName: e['serviceName'] ?? '',
          status: _parseQueueStatus(e['status']),
          position: (data['position'] ?? 1) as int,
          estimatedWait: (data['estimatedWait'] ?? 0) as int,
          joinedAt: DateTime.tryParse(e['createdAt'] ?? '') ?? DateTime.now(),
        );
      }
    } catch (e) {
      debugPrint('fetchQueueStatus error: \$e');
    } finally {
      _queueLoading = false;
      notifyListeners();
    }
  }

  QueueStatus _parseQueueStatus(String? s) {
    switch (s) {
      case 'pending':   return QueueStatus.pending;
      case 'confirmed': return QueueStatus.confirmed;
      case 'serving':   return QueueStatus.serving;
      case 'completed': return QueueStatus.completed;
      case 'cancelled': return QueueStatus.cancelled;
      case 'noShow':    return QueueStatus.noShow;
      default:          return QueueStatus.pending;
    }
  }

  void addQueueFromJoinResult(QueueJoinResult result) {
    _currentQueue = QueueEntry(
      id: result.entryId,
      queueNumber: result.queueNumber,
      patientName: _currentUser?.fullName ?? '',
      patientEmail: _currentUser?.email,
      patientPhone: _currentUser?.phone,
      clinicName: result.clinicName,
      serviceName: result.serviceName,
      status: QueueStatus.pending,
      position: result.position,
      estimatedWait: result.estimatedWait,
      joinedAt: DateTime.now(),
    );
    notifyListeners();
    fetchQueueStatus();
  }

  Future<bool> cancelQueue(String id) async {
    final ok = await ApiService.cancelQueue(id);
    if (ok) {
      _currentQueue = null;
      notifyListeners();
    }
    return ok;
  }

  /* ----------------------------------------------------------------
     CHAT
  ---------------------------------------------------------------- */
  List<ChatMessage> _chatMessages = [];
  List<ChatMessage> get chatMessages => List.unmodifiable(_chatMessages);

  void addChatMessage(ChatMessage msg) {
    _chatMessages.add(msg);
    notifyListeners();
  }

  Future<void> sendChatMessage(String text) async {
    addChatMessage(ChatMessage(text: text, isUser: true, timestamp: DateTime.now()));
    try {
      final res = await ApiService.sendChatMessage(text);
      final reply = res['reply'] ?? res['response'] ?? res['message'] ?? 'I could not process that.';
      addChatMessage(ChatMessage(text: reply, isUser: false, timestamp: DateTime.now()));
    } catch (e) {
      addChatMessage(ChatMessage(text: 'Service unavailable. Please try again.', isUser: false, timestamp: DateTime.now()));
    }
  }
}
