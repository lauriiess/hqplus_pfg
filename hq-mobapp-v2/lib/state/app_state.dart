import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../models/appointment_models.dart';
import '../models/queue_models.dart';
import '../models/chat_models.dart';
import '../models/user_models.dart';

class AppState extends ChangeNotifier {

  /* ────────────────────────────────────────────────────────────
     AUTH — real server
  ──────────────────────────────────────────────────────────── */
  AppUser? _currentUser;
  bool _isAuthLoading = false;

  AppUser? get currentUser => _currentUser;
  bool get isLoggedIn      => _currentUser != null;
  bool get isAuthLoading   => _isAuthLoading;

  Future<void> login({required String identifier, required String password}) async {
    _isAuthLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.login(identifier, password);
      _currentUser = _userFromMap(data['user'] ?? data);
      await Future.wait([fetchAppointments(), fetchQueueStatus()]);
    } finally {
      _isAuthLoading = false;
      notifyListeners();
    }
  }

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
        'fullName': fullName, 'email': email, 'phone': phone,
        'dateOfBirth': dob.toIso8601String(),
        'password': password, 'role': 'patient',
      });
      _currentUser = _userFromMap(data['user'] ?? data, fallback: {
        'fullName': fullName, 'email': email, 'phone': phone,
      });
    } finally {
      _isAuthLoading = false;
      notifyListeners();
    }
  }

  AppUser _userFromMap(dynamic u, {Map<String, dynamic>? fallback}) {
    final m = (u is Map<String, dynamic>) ? u : <String, dynamic>{};
    final f = fallback ?? {};
    return AppUser(
      id:               m['_id']      ?? m['id']      ?? '',
      fullName:         m['fullName'] ?? f['fullName'] ?? '',
      email:            m['email']    ?? f['email']    ?? '',
      phone:            m['phone']    ?? f['phone']    ?? '',
      dob:              DateTime.tryParse(m['dateOfBirth'] ?? '') ?? DateTime(2000),
      password:         '',
      patientType:      m['patientType']     ?? 'Regular Patient',
      patientId:        m['patientId']       ?? '',
      age:              m['age']?.toString() ?? '',
      philHealthNumber: m['philHealthNumber'] ?? '',
      hmoNumber:        m['hmoNumber']        ?? '',
    );
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
    String? fullName, String? phone, String? age,
    String? patientType, String? philHealthNumber, String? hmoNumber,
  }) async {
    if (_currentUser == null) return;
    final body = <String, dynamic>{};
    if (fullName != null)         body['fullName']         = fullName;
    if (phone != null)            body['phone']            = phone;
    if (age != null)              body['age']              = age;
    if (patientType != null)      body['patientType']      = patientType;
    if (philHealthNumber != null) body['philHealthNumber'] = philHealthNumber;
    if (hmoNumber != null)        body['hmoNumber']        = hmoNumber;
    try {
      final updated = await ApiService.updateProfile(body);
      _currentUser = _currentUser!.copyWith(
        fullName: updated['fullName'], phone: updated['phone'],
        age: updated['age']?.toString(), patientType: updated['patientType'],
        philHealthNumber: updated['philHealthNumber'], hmoNumber: updated['hmoNumber'],
      );
      notifyListeners();
    } catch (e) { debugPrint('updateProfile error: $e'); }
  }

  /* ────────────────────────────────────────────────────────────
     APPOINTMENTS — live from server
  ──────────────────────────────────────────────────────────── */
  List<Appointment> _appointments = [];
  bool _apptLoading = false;

  List<Appointment> get appointments    => List.unmodifiable(_appointments);
  bool              get apptLoading     => _apptLoading;

  List<Appointment> get upcomingAppointments => _appointments.where((a) =>
    a.status == AppointmentStatus.scheduled  ||
    a.status == AppointmentStatus.pending    ||
    a.status == AppointmentStatus.confirmed
  ).toList();

  Future<void> fetchAppointments() async {
    _apptLoading = true;
    notifyListeners();
    try {
      final list = await ApiService.getMyAppointments();
      _appointments = list.map((a) {
        final m = a as Map<String, dynamic>;
        return Appointment(
          id:         m['_id'] ?? m['id'] ?? '',
          clinicName: (m['clinicId'] is Map) ? m['clinicId']['name'] ?? '' : m['clinicName'] ?? '',
          department: (m['serviceId'] is Map) ? m['serviceId']['name'] ?? '' : m['department'] ?? m['service'] ?? '',
          doctor:     (m['staffId']  is Map) ? m['staffId']['fullName'] ?? '' : m['doctor'] ?? '',
          date:       DateTime.tryParse(m['appointmentDate'] ?? m['date'] ?? '') ?? DateTime.now(),
          timeLabel:  m['timeSlot'] ?? m['timeLabel'] ?? '',
          status:     _parseApptStatus(m['status']),
          notes:      m['notes'] ?? '',
        );
      }).toList();
    } catch (e) { debugPrint('fetchAppointments error: $e'); }
    finally {
      _apptLoading = false;
      notifyListeners();
    }
  }

  AppointmentStatus _parseApptStatus(String? s) {
    switch (s) {
      case 'pending':     return AppointmentStatus.pending;
      case 'confirmed':   return AppointmentStatus.confirmed;
      case 'arrived':     return AppointmentStatus.arrived;
      case 'serving':     return AppointmentStatus.serving;
      case 'completed':   return AppointmentStatus.completed;
      case 'cancelled':   return AppointmentStatus.cancelled;
      case 'noShow':      return AppointmentStatus.noShow;
      case 'rescheduled': return AppointmentStatus.rescheduled;
      default:             return AppointmentStatus.pending;
    }
  }

  void addAppointment(Appointment appt) {
    _appointments.insert(0, appt);
    notifyListeners();
    fetchAppointments();
  }

  void updateAppointment(String id, {
    AppointmentStatus? status, DateTime? date, String? timeLabel, String? notes,
  }) {
    final idx = _appointments.indexWhere((a) => a.id == id);
    if (idx == -1) return;
    _appointments[idx] = _appointments[idx].copyWith(
        status: status, date: date, timeLabel: timeLabel, notes: notes);
    notifyListeners();
    if (status == AppointmentStatus.cancelled) {
      ApiService.cancelAppointment(id).catchError((_) {});
    }
    fetchAppointments();
  }

  /* ────────────────────────────────────────────────────────────
     QUEUE — live from server
  ──────────────────────────────────────────────────────────── */
  QueueEntry? _currentQueue;
  bool _queueLoading = false;

  QueueEntry? get currentQueue  => _currentQueue;
  bool        get queueLoading  => _queueLoading;

  // Used by dashboard _getActiveQueues
  List<QueueEntry> get activeQueues =>
      _currentQueue == null ? <QueueEntry>[] : <QueueEntry>[_currentQueue!];

  Future<void> fetchQueueStatus() async {
    _queueLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.getMyQueueStatus();
      if (data.isEmpty || data['entry'] == null) {
        _currentQueue = null;
      } else {
        final e = data['entry'] as Map<String, dynamic>;
        _currentQueue = QueueEntry(
          id:           e['_id'] ?? e['id'] ?? '',
          queueNumber:  e['queueNumber']?.toString() ?? 'N/A',
          clinicName:   (e['clinic'] is Map) ? e['clinic']['name'] ?? '' : e['clinicName'] ?? '',
          serviceName:  e['serviceName'] ?? '',
          patientName:  _currentUser?.fullName ?? '',
          patientEmail: _currentUser?.email,
          patientPhone: _currentUser?.phone,
          status:       _parseQueueStatus(e['status']),
          position:     (data['peopleAhead'] ?? 0) as int,
          estimatedWait:(data['estimatedWaitTime'] ?? e['estimatedWaitMinutes'] ?? 0) as int,
          joinedAt:     DateTime.tryParse(e['joinedAt'] ?? '') ?? DateTime.now(),
        );
      }
    } catch (e) { debugPrint('fetchQueueStatus error: $e'); }
    finally {
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
      case 'waiting':   return QueueStatus.waiting;
      default:          return QueueStatus.pending;
    }
  }

  void addQueueFromJoinResult(QueueJoinResult result) {
    _currentQueue = QueueEntry(
      id:           result.entryId,
      queueNumber:  result.queueNumber,
      clinicName:   result.clinicName,
      serviceName:  result.serviceName,
      patientName:  _currentUser?.fullName ?? result.patientName,
      patientEmail: _currentUser?.email    ?? result.patientEmail,
      patientPhone: _currentUser?.phone    ?? result.patientPhone,
      status:       QueueStatus.pending,
      position:     result.position,
      estimatedWait:result.estimatedWait,
      joinedAt:     result.joinedAt,
    );
    notifyListeners();
    fetchQueueStatus();
  }

  Future<bool> cancelQueue(String id) async {
    final ok = await ApiService.cancelQueue(id);
    if (ok) { _currentQueue = null; notifyListeners(); }
    return ok;
  }

  /* ────────────────────────────────────────────────────────────
     CHAT
  ──────────────────────────────────────────────────────────── */
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
    } catch (_) {
      addChatMessage(ChatMessage(
          text: 'Service unavailable. Please try again.',
          isUser: false, timestamp: DateTime.now()));
    }
  }
}
