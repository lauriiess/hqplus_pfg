import 'package:flutter/foundation.dart';
import '../models/appointment_models.dart';
import '../models/queue_models.dart';
import '../models/chat_models.dart';
import '../models/user_models.dart';

class AppState extends ChangeNotifier {
  /* --------------------------
    AUTH / USERS (MOCK)
  -------------------------- */
  final List<AppUser> _users = [];
  AppUser? _currentUser;

  List<AppUser> get users => List.unmodifiable(_users);
  AppUser? get currentUser => _currentUser;
  bool get isLoggedIn => _currentUser != null;

  String _normalizeEmail(String s) => s.trim().toLowerCase();
  String _normalizePhone(String s) => s.trim();

  AppUser? findUserByEmailOrPhone(String identifier) {
    final id = identifier.trim();
    if (id.isEmpty) return null;

    final email = _normalizeEmail(id);
    final phone = _normalizePhone(id);

    for (final u in _users) {
      if (u.email.isNotEmpty && _normalizeEmail(u.email) == email) return u;
      if (u.phone.isNotEmpty && _normalizePhone(u.phone) == phone) return u;
    }
    return null;
  }

  bool emailExists(String email) {
    final e = _normalizeEmail(email);
    if (e.isEmpty) return false;
    return _users.any((u) => _normalizeEmail(u.email) == e);
  }

  bool phoneExists(String phone) {
    final p = _normalizePhone(phone);
    if (p.isEmpty) return false;
    return _users.any((u) => _normalizePhone(u.phone) == p);
  }

  String _nextPatientId() {
    // PT-YYYY-###
    final year = DateTime.now().year;
    final count = _users.length + 1;
    return "PT-$year-${count.toString().padLeft(3, '0')}";
  }

  /// Register (supports many accounts)
  /// - If registering by email, require unique email
  /// - If registering by phone, require unique phone
  void registerUser({
    required String fullName,
    required String email,
    required String phone,
    required DateTime dob,
    required String password,
  }) {
    final cleanName = fullName.trim().replaceAll(RegExp(r'\s+'), ' ');
    final cleanEmail = _normalizeEmail(email);
    final cleanPhone = _normalizePhone(phone);

    if (cleanName.isEmpty) {
      throw Exception("Full name is required.");
    }
    if (cleanEmail.isEmpty && cleanPhone.isEmpty) {
      throw Exception("Email or phone number is required.");
    }
    if (password.isEmpty) {
      throw Exception("Password is required.");
    }

    if (cleanEmail.isNotEmpty && emailExists(cleanEmail)) {
      throw Exception("Email already registered.");
    }
    if (cleanPhone.isNotEmpty && phoneExists(cleanPhone)) {
      throw Exception("Phone number already registered.");
    }

    final user = AppUser(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      dob: dob,
      password: password, // demo only (do NOT store plaintext in real apps)
      patientType: "Regular Patient",
      patientId: _nextPatientId(),
      age: "", // optional
      philHealthNumber: "",
      hmoNumber: "",
    );

    _users.add(user);
    _currentUser = user; // ✅ auto-login after register
    notifyListeners();
  }

  /// Login via email OR phone
  void login({
    required String identifier,
    required String password,
  }) {
    final u = findUserByEmailOrPhone(identifier);
    if (u == null) {
      throw Exception("Account not found.");
    }
    if (u.password != password) {
      throw Exception("Incorrect password.");
    }
    _currentUser = u;
    notifyListeners();
  }

  void logout() {
    _currentUser = null;
    notifyListeners();
  }

  /// Update profile of the logged-in user (syncs Profile screen)
  void updateCurrentUserProfile({
    String? fullName,
    String? phone,
    String? age,
    String? patientType,
    String? philHealthNumber,
    String? hmoNumber,
  }) {
    if (_currentUser == null) return;

    final updated = _currentUser!.copyWith(
      fullName: fullName,
      phone: phone,
      age: age,
      patientType: patientType,
      philHealthNumber: philHealthNumber,
      hmoNumber: hmoNumber,
    );

    // update list
    final idx = _users.indexWhere((x) => x.id == updated.id);
    if (idx != -1) _users[idx] = updated;

    _currentUser = updated;
    notifyListeners();
  }

  /* --------------------------
    APPOINTMENTS STATE
  -------------------------- */
  final List<Appointment> _appointments = [];
  List<Appointment> get appointments => List.unmodifiable(_appointments);

  Appointment? getAppointmentById(String id) {
    for (final a in _appointments) {
      if (a.id == id) return a;
    }
    return null;
  }

  List<Appointment> get upcomingAppointments {
    return _appointments
        .where((a) =>
            a.status == AppointmentStatus.scheduled ||
            a.status == AppointmentStatus.confirmed)
        .toList();
  }

  List<Appointment> get pastAppointments {
    return _appointments
        .where((a) =>
            a.status == AppointmentStatus.completed ||
            a.status == AppointmentStatus.cancelled)
        .toList();
  }

  void addAppointment(Appointment a) {
    _appointments.add(a);
    notifyListeners();
  }

  void cancelAppointment(String appointmentId) {
    final i = _appointments.indexWhere((a) => a.id == appointmentId);
    if (i == -1) return;
    _appointments[i] =
        _appointments[i].copyWith(status: AppointmentStatus.cancelled);
    notifyListeners();
  }

  void completeAppointment(String appointmentId) {
    final i = _appointments.indexWhere((a) => a.id == appointmentId);
    if (i == -1) return;
    _appointments[i] =
        _appointments[i].copyWith(status: AppointmentStatus.completed);
    notifyListeners();
  }

  void rescheduleAppointment({
    required String appointmentId,
    required DateTime newDate,
    required String newTimeLabel,
    String? newNotes,
    required AppointmentStatus status,
  }) {
    final i = _appointments.indexWhere((a) => a.id == appointmentId);
    if (i == -1) return;
    _appointments[i] =
        _appointments[i].copyWith(date: newDate, timeLabel: newTimeLabel);
    notifyListeners();
  }

  // Update any fields of an existing appointment
  void updateAppointment(
    String appointmentId, {
    AppointmentStatus? status,
    DateTime? date,
    String? timeLabel,
    String? notes,
  }) {
    final i = _appointments.indexWhere((a) => a.id == appointmentId);
    if (i == -1) return;

    _appointments[i] = _appointments[i].copyWith(
      status: status,
      date: date,
      timeLabel: timeLabel,
      notes: notes,
    );

    notifyListeners();
  }

  /* --------------------------
    QUEUE STATE
    - supports "multi-department queue" like you want
  -------------------------- */
  final List<QueueEntry> _queues = [];

  List<QueueEntry> get queues => List.unmodifiable(_queues);

  // active = waiting or inProgress
  List<QueueEntry> get activeQueues => _queues
      .where((q) =>
          q.status == QueueStatus.waiting || q.status == QueueStatus.inProgress)
      .toList();

  List<QueueEntry> get finishedQueues => _queues
      .where((q) =>
          q.status == QueueStatus.completed || q.status == QueueStatus.missed)
      .toList();

  /// Join queue using the data returned by Join Queue screen
  /// (QueueJoinResult is your model)
  void addQueueFromJoinResult(QueueJoinResult r) {
    final entry = QueueEntry(
      id: r.id,
      queueNumber: r.queueNumber,
      queueType: r.queueType,
      departmentId: r.departmentId,
      departmentName: r.departmentName,
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      doctorId: r.doctorId,
      doctorName: r.doctorName,
      joinedAt: r.joinedAt,
      position: r.position,
      totalAhead: r.totalAhead,
      estimatedWaitTimeMinutes: r.estimatedWaitTimeMinutes,
      status: QueueStatus.waiting,
    );

    _queues.add(entry);
    notifyListeners();
  }

  /// Leave queue = mark as missed (or remove if you prefer)
  void leaveQueue(String queueNumber) {
    final i = _queues.indexWhere((q) => q.queueNumber == queueNumber);
    if (i == -1) return;

    final q = _queues[i];
    _queues[i] = QueueEntry(
      queueNumber: q.queueNumber,
      queueType: q.queueType,
      departmentId: q.departmentId,
      departmentName: q.departmentName,
      serviceId: q.serviceId,
      serviceName: q.serviceName,
      doctorId: q.doctorId,
      doctorName: q.doctorName,
      joinedAt: q.joinedAt,
      position: q.position,
      totalAhead: q.totalAhead,
      estimatedWaitTimeMinutes: q.estimatedWaitTimeMinutes,
      status: QueueStatus.missed,
    );

    notifyListeners();
  }

  /// Update status timeline (e.g., waiting -> inProgress -> completed)
  void updateQueueStatus(String queueNumber, QueueStatus newStatus) {
    final i = _queues.indexWhere((q) => q.queueNumber == queueNumber);
    if (i == -1) return;

    final q = _queues[i];
    _queues[i] = QueueEntry(
      queueNumber: q.queueNumber,
      queueType: q.queueType,
      departmentId: q.departmentId,
      departmentName: q.departmentName,
      serviceId: q.serviceId,
      serviceName: q.serviceName,
      doctorId: q.doctorId,
      doctorName: q.doctorName,
      joinedAt: q.joinedAt,
      position: q.position,
      totalAhead: q.totalAhead,
      estimatedWaitTimeMinutes: q.estimatedWaitTimeMinutes,
      status: newStatus,
    );

    notifyListeners();
  }

  /* --------------------------
    CHAT STATE
  -------------------------- */
  final List<ChatMessage> _messages = [];
  List<ChatMessage> get messages => List.unmodifiable(_messages);

  /// Call once (e.g. in ChatbotScreen initState) so the greeting appears.
  void seedChatIfEmpty() {
    if (_messages.isNotEmpty) return;

    final now = DateTime.now();
    _messages.addAll([
      ChatMessage(
        id: '1',
        sender: ChatSender.bot,
        message:
            "Hello! I'm your HealthQueue+ AI assistant. How can I help you today?",
        timestamp: now,
      ),
      ChatMessage(
        id: '2',
        sender: ChatSender.bot,
        message: "I can help you with:\n"
            "• Booking appointments\n"
            "• Queue information\n"
            "• Department details\n"
            "• Checking your active appointment/queue\n\n"
            "What would you like to do?",
        timestamp: now,
        quickReplies: const [
          "Book Appointment",
          "Queue Status",
          "My Appointments"
        ],
      ),
    ]);
    notifyListeners();
  }

  void addMessage(ChatMessage m) {
    _messages.add(m);
    notifyListeners();
  }

  void addUserText(String text) {
    _messages.add(ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sender: ChatSender.user,
      message: text,
      timestamp: DateTime.now(),
    ));
    notifyListeners();
  }

  void addBotText(String text, {List<String> quickReplies = const []}) {
    _messages.add(ChatMessage(
      id: (DateTime.now().millisecondsSinceEpoch + 1).toString(),
      sender: ChatSender.bot,
      message: text,
      timestamp: DateTime.now(),
      quickReplies: quickReplies,
    ));
    notifyListeners();
  }

  void clearChat() {
    _messages.clear();
    notifyListeners();
  }

  /* --------------------------
    HELPERS FOR DASHBOARD COUNTS
  -------------------------- */
  int get upcomingAppointmentsCount => upcomingAppointments.length;
  int get activeQueuesCount => activeQueues.length;

  // optional: dashboard "current queue" (latest active)
  QueueEntry? get currentQueue {
    final actives = activeQueues;
    if (actives.isEmpty) return null;
    actives.sort((a, b) => b.joinedAt.compareTo(a.joinedAt));
    return actives.first;
  }
}
