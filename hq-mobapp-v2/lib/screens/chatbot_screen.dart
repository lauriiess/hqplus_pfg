// ignore_for_file: unnecessary_cast
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';
// models
import '../models/chat_models.dart';
import '../models/queue_models.dart';
import '../models/appointment_models.dart' as apt;
// shared master data
import '../data/hospital_data.dart';
import '../data/hospital_data.dart' as hospital;

/* -----------------------
   FLOW STATE
----------------------- */
enum _FlowMode { none, booking, queue }

enum _BookingStep { department, doctor, date, time, patientType, confirm }

enum _QueueStep { department, queueType, confirm }

class _BookingDraft {
  String? departmentId;
  String? departmentName;

  String? doctorId;
  String? doctorName;

  DateTime? date;
  String? timeLabel;

  String? patientType;

  void clear() {
    departmentId = null;
    departmentName = null;
    doctorId = null;
    doctorName = null;
    date = null;
    timeLabel = null;
    patientType = null;
  }
}

class _QueueDraft {
  String? departmentId;
  String? departmentName;
  QueueType? queueType;

  void clear() {
    departmentId = null;
    departmentName = null;
    queueType = null;
  }
}

class ChatbotScreen extends StatefulWidget {
  final VoidCallback onBookAppointment;
  final VoidCallback onViewQueue;

  const ChatbotScreen({
    super.key,
    required this.onBookAppointment,
    required this.onViewQueue,
  });

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();

  _FlowMode _mode = _FlowMode.none;

  _BookingStep _bookingStep = _BookingStep.department;
  _QueueStep _queueStep = _QueueStep.department;

  final _BookingDraft _booking = _BookingDraft();
  final _QueueDraft _queueDraft = _QueueDraft();

  // bot responses (simple matcher)
  final Map<String, Map<String, dynamic>> botResponses = {
    'departments': {
      'message': 'We have the following OPD departments:\n\n'
          '• General Medicine\n'
          '• Pediatrics\n'
          '• OB-GYN\n'
          '• Orthopedics\n'
          '• Cardiology\n'
          '• Neurology\n'
          '• Laboratory\n'
          '• Radiology / Imaging\n\n'
          'If you want, I can start booking for you.',
      'quickReplies': ['Book Appointment', 'Back to menu'],
    },
    'help': {
      'message': 'Here are some common things I can do:\n\n'
          '• Start booking an appointment\n'
          '• Start getting a queue number\n'
          '• Show your active queue\n'
          '• Show your upcoming appointments\n\n'
          'What do you want to do?',
      'quickReplies': [
        'Book Appointment',
        'Join Queue',
        'Queue Status',
        'My Appointments'
      ],
    },
    'default': {
      'message': "Choose an option below or type:\n"
          "• book appointment\n"
          "• join queue\n"
          "• queue status\n"
          "• my appointments\n\n"
          "You can also type: cancel (during booking/queue)",
      'quickReplies': [
        'Book Appointment',
        'Join Queue',
        'Queue Status',
        'My Appointments'
      ],
    },
  };

  @override
  void initState() {
    super.initState();
    // seed chat after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<AppState>().seedChatIfEmpty();
      _scrollToBottom();
    });
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (!_scrollCtrl.hasClients) return;
    _scrollCtrl.animateTo(
      _scrollCtrl.position.maxScrollExtent,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  /* -----------------------
     BOT HELPER
  ----------------------- */
  void _bot(String text, {List<String> quick = const []}) {
    context.read<AppState>().addBotText(text, quickReplies: quick);
  }

  void _resetFlow() {
    _mode = _FlowMode.none;
    _booking.clear();
    _queueDraft.clear();
    _bookingStep = _BookingStep.department;
    _queueStep = _QueueStep.department;
  }

  /* -----------------------
     PARSERS / MATCHERS
  ----------------------- */
  String _prettyDate(DateTime d) => "${d.month}/${d.day}/${d.year}";

  DateTime? _parseDate(String input) {
    final s = input.trim();
    final parts = s.split(RegExp(r'[\/\-]'));
    if (parts.length != 3) return null;

    final m = int.tryParse(parts[0]);
    final d = int.tryParse(parts[1]);
    final y = int.tryParse(parts[2]);
    if (m == null || d == null || y == null) return null;

    if (m < 1 || m > 12) return null;
    if (d < 1 || d > 31) return null;
    if (y < 2020 || y > 2100) return null;

    return DateTime(y, m, d);
  }

  String? _normalizeTimeLabel(String input) {
    final s = input.trim().toUpperCase();
    final re = RegExp(r'^(\d{1,2}):(\d{2})\s*(AM|PM)?$');
    final m = re.firstMatch(s);
    if (m == null) return null;

    final hh = int.tryParse(m.group(1)!);
    final mm = int.tryParse(m.group(2)!);
    final ap = m.group(3);

    if (hh == null || mm == null) return null;
    if (hh < 1 || hh > 12) return null;
    if (mm < 0 || mm > 59) return null;

    final suffix = ap ?? "AM";
    return "${hh}:${mm.toString().padLeft(2, '0')} $suffix";
  }

  String _deptListText(List<dynamic> depts) {
    final b = StringBuffer();
    for (int i = 0; i < depts.length; i++) {
      b.writeln("${i + 1}. ${depts[i].name}");
    }
    return b.toString();
  }

  dynamic _matchDepartment(String input, List<dynamic> depts) {
    final s = input.trim().toLowerCase();
    final n = int.tryParse(s);
    if (n != null && n >= 1 && n <= depts.length) return depts[n - 1];

    for (final d in depts) {
      if (d.name.toLowerCase() == s) return d;
    }
    for (final d in depts) {
      final dn = d.name.toLowerCase();
      if (dn.contains(s) || s.contains(dn)) return d;
    }
    return null;
  }

  Doctor? _matchDoctor(String input, List<Doctor> list) {
    final s = input.trim().toLowerCase();
    final n = int.tryParse(s);
    if (n != null && n >= 1 && n <= list.length) return list[n - 1];

    for (final d in list) {
      if (d.name.toLowerCase() == s) return d;
    }
    for (final d in list) {
      final dn = d.name.toLowerCase();
      if (dn.contains(s) || s.contains(dn)) return d;
    }
    return null;
  }

  String _doctorListText(List<Doctor> docs) {
    final b = StringBuffer();
    for (int i = 0; i < docs.length; i++) {
      b.writeln("${i + 1}. ${docs[i].name}");
    }
    return b.toString();
  }

  /* -----------------------
     START CHAT FLOWS
  ----------------------- */
  void _startBookingChatFlow() {
    _resetFlow();
    _mode = _FlowMode.booking;
    _bookingStep = _BookingStep.department;

    final depts = hospital.departments;

    _bot(
      "Let’s book your appointment ✅\n\n"
      "Step 1/5 — Select a department.\n"
      "Reply with the department name or number:\n\n"
      "${_deptListText(depts)}",
      quick: depts.take(6).map((d) => d.name as String).toList(),
    );
  }

  void _startQueueChatFlow() {
    _resetFlow();
    _mode = _FlowMode.queue;
    _queueStep = _QueueStep.department;

    final depts = hospital.departments;

    _bot(
      "Let’s get your queue number ✅\n\n"
      "Step 1/3 — Select a department.\n"
      "Reply with the department name or number:\n\n"
      "${_deptListText(depts)}",
      quick: depts.take(6).map((d) => d.name as String).toList(),
    );
  }

  /* -----------------------
     BOOKING FLOW
  ----------------------- */
  Future<void> _continueBookingFlow(String userText) async {
    final txt = userText.trim();
    final lower = txt.toLowerCase();

    if (lower == "cancel") {
      _bot("Booking cancelled. Back to menu.",
          quick: (botResponses['default']!['quickReplies'] as List)
              .cast<String>());
      _resetFlow();
      return;
    }

    final depts = hospital.departments;
    final allDocs = doctors; // from hospital_data.dart

    if (_bookingStep == _BookingStep.department) {
      final dept = _matchDepartment(txt, depts);
      if (dept == null) {
        _bot(
            "I didn’t catch that. Choose a department by name or number:\n\n${_deptListText(depts)}");
        return;
      }

      _booking.departmentId = dept.id;
      _booking.departmentName = dept.name;

      final deptDocs = allDocs.where((d) => d.departmentId == dept.id).toList();
      if (deptDocs.isEmpty) {
        _bot(
            "No doctors available for ${dept.name}. Please pick another department.",
            quick: depts.take(6).map((d) => d.name as String).toList());
        _bookingStep = _BookingStep.department;
        return;
      }

      _bookingStep = _BookingStep.doctor;
      _bot(
        "Step 2/5 — Choose a doctor for ${dept.name}.\n"
        "Reply with doctor name or number:\n\n"
        "${_doctorListText(deptDocs)}",
        quick: deptDocs.take(6).map((d) => d.name).toList(),
      );
      return;
    }

    if (_bookingStep == _BookingStep.doctor) {
      final deptDocs = allDocs
          .where((d) => d.departmentId == _booking.departmentId)
          .toList();
      final doc = _matchDoctor(txt, deptDocs);
      if (doc == null) {
        _bot(
            "Please choose a doctor by name or number:\n\n${_doctorListText(deptDocs)}");
        return;
      }

      _booking.doctorId = doc.id;
      _booking.doctorName = doc.name;

      _bookingStep = _BookingStep.date;
      _bot(
        "Step 3/5 — What date do you prefer?\nType it like: 02/13/2026",
        quick: const ["Tomorrow", "Next week", "Cancel"],
      );
      return;
    }

    if (_bookingStep == _BookingStep.date) {
      DateTime? date;
      if (lower == "tomorrow") {
        final now = DateTime.now();
        date =
            DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
      } else if (lower == "next week") {
        final now = DateTime.now();
        date =
            DateTime(now.year, now.month, now.day).add(const Duration(days: 7));
      } else {
        date = _parseDate(txt);
      }

      if (date == null) {
        _bot("Please enter a valid date like 02/13/2026 (MM/DD/YYYY).");
        return;
      }

      _booking.date = date;

      _bookingStep = _BookingStep.time;
      _bot(
        "Step 4/5 — What time?\nType like: 10:00 AM",
        quick: const ["9:00 AM", "10:00 AM", "1:00 PM", "3:00 PM", "Cancel"],
      );
      return;
    }

    if (_bookingStep == _BookingStep.time) {
      final time = _normalizeTimeLabel(txt);
      if (time == null) {
        _bot("Please enter a valid time like 10:00 AM.");
        return;
      }

      _booking.timeLabel = time;

      _bookingStep = _BookingStep.patientType;
      _bot(
        "Step 5/5 — Patient type?\nChoose one:",
        quick: const ["Regular", "Priority", "Cancel"],
      );
      return;
    }

    if (_bookingStep == _BookingStep.patientType) {
      if (lower != "regular" && lower != "priority") {
        _bot("Please choose: Regular or Priority.",
            quick: const ["Regular", "Priority", "Cancel"]);
        return;
      }

      _booking.patientType = (lower == "priority") ? "Priority" : "Regular";
      _bookingStep = _BookingStep.confirm;

      final summary = "✅ Please confirm your appointment:\n\n"
          "Department: ${_booking.departmentName}\n"
          "Doctor: ${_booking.doctorName}\n"
          "Date: ${_prettyDate(_booking.date!)}\n"
          "Time: ${_booking.timeLabel}\n"
          "Patient: ${_booking.patientType}\n";

      _bot(summary, quick: const ["Confirm", "Cancel"]);
      return;
    }

    if (_bookingStep == _BookingStep.confirm) {
      if (lower == "cancel") {
        _bot("Booking cancelled. Back to menu.",
            quick: (botResponses['default']!['quickReplies'] as List)
                .cast<String>());
        _resetFlow();
        return;
      }
      if (lower != "confirm") {
        _bot("Please tap Confirm or Cancel.",
            quick: const ["Confirm", "Cancel"]);
        return;
      }

      // create appointment safely
      final apptObj = apt.Appointment(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        departmentId: _booking.departmentId ?? '',
        departmentName: _booking.departmentName ?? '',
        serviceName: '',
        doctorId: _booking.doctorId ?? '',
        doctorName: _booking.doctorName ?? '',
        date: _booking.date!,
        timeLabel: _booking.timeLabel ?? '',
        patientTypeLabel: _booking.patientType ?? 'Regular',
        status: apt.AppointmentStatus.scheduled,
        notes: null,
      );

      context.read<AppState>().addAppointment(apptObj);

      _bot(
        "🎉 Appointment booked!\n\n"
        "Doctor: ${apptObj.doctorName}\n"
        "Department: ${apptObj.departmentName}\n"
        "Date: ${_prettyDate(apptObj.date)}\n"
        "Time: ${apptObj.timeLabel}\n\n"
        "Want me to show your upcoming appointments?",
        quick: const ["My Appointments", "Back to menu"],
      );

      _resetFlow();
      return;
    }
  }

  /* -----------------------
     QUEUE FLOW
  ----------------------- */
  Future<void> _continueQueueFlow(String userText) async {
    final txt = userText.trim();
    final lower = txt.toLowerCase();

    if (lower == "cancel") {
      _bot("Queue request cancelled. Back to menu.",
          quick: (botResponses['default']!['quickReplies'] as List)
              .cast<String>());
      _resetFlow();
      return;
    }

    final depts = hospital.departments;

    if (_queueStep == _QueueStep.department) {
      final dept = _matchDepartment(txt, depts);
      if (dept == null) {
        _bot(
            "Please choose a department by name or number:\n\n${_deptListText(depts)}");
        return;
      }

      _queueDraft.departmentId = dept.id;
      _queueDraft.departmentName = dept.name;

      _queueStep = _QueueStep.queueType;
      _bot("Step 2/3 — Queue type?\nRegular or Priority?",
          quick: const ["Regular", "Priority", "Cancel"]);
      return;
    }

    if (_queueStep == _QueueStep.queueType) {
      if (lower != "regular" && lower != "priority") {
        _bot("Please choose: Regular or Priority.",
            quick: const ["Regular", "Priority", "Cancel"]);
        return;
      }

      _queueDraft.queueType =
          (lower == "priority") ? QueueType.priority : QueueType.regular;
      _queueStep = _QueueStep.confirm;

      _bot(
        "✅ Confirm queue request:\n\n"
        "Department: ${_queueDraft.departmentName}\n"
        "Type: ${_queueDraft.queueType == QueueType.priority ? "Priority" : "Regular"}\n",
        quick: const ["Confirm", "Cancel"],
      );
      return;
    }

    if (_queueStep == _QueueStep.confirm) {
      if (lower == "cancel") {
        _bot("Queue request cancelled. Back to menu.",
            quick: (botResponses['default']!['quickReplies'] as List)
                .cast<String>());
        _resetFlow();
        return;
      }
      if (lower != "confirm") {
        _bot("Please tap Confirm or Cancel.",
            quick: const ["Confirm", "Cancel"]);
        return;
      }

      final deptName = _queueDraft.departmentName ?? "Department";
      final type = _queueDraft.queueType ?? QueueType.regular;

      final prefix = deptName.isNotEmpty ? deptName[0].toUpperCase() : "Q";
      final queueNum =
          "$prefix-${(100 + (DateTime.now().second * 3)).toString()}";

      final join = QueueJoinResult(
        queueNumber: queueNum,
        queueType: type,
        departmentId: _queueDraft.departmentId ?? '',
        departmentName: deptName,
        serviceId: '',
        serviceName: '',
        doctorId: null,
        doctorName: null,
        joinedAt: DateTime.now(),
        position: 5,
        totalAhead: 7,
        estimatedWaitTimeMinutes: 40,
        patientName: '',
      );

      context.read<AppState>().addQueueFromJoinResult(join);

      final min = (join.estimatedWaitTimeMinutes - 2).clamp(1, 999);
      final max = (join.estimatedWaitTimeMinutes + 3).clamp(1, 999);

      _bot(
        "✅ Joined queue!\n\n"
        "Queue Number: ${join.queueNumber}\n"
        "Department: ${join.departmentName}\n"
        "Estimated wait: $min–$max mins\n\n"
        "Want to check your queue status now?",
        quick: const ["Queue Status", "View Queue Details", "Back to menu"],
      );

      _resetFlow();
      return;
    }
  }

  /* -----------------------
     STATUS REPLIES (same)
  ----------------------- */
  void _replyQueueStatus() {
    final appState = context.read<AppState>();
    final q = appState.currentQueue;

    if (q == null) {
      appState.addBotText(
        "You don’t have an active queue right now.\nDo you want to get a queue number?",
        quickReplies: const ["Join Queue", "Back to menu"],
      );
      return;
    }

    final min = (q.estimatedWaitTimeMinutes - 2).clamp(1, 999);
    final max = (q.estimatedWaitTimeMinutes + 3).clamp(1, 999);

    appState.addBotText(
      "📍 Active Queue Status\n\n"
      "Queue: ${q.queueNumber}\n"
      "Department: ${q.departmentName}\n"
      "Position: ${q.position}\n"
      "Ahead: ${q.totalAhead}\n"
      "Est wait: $min–$max mins\n\n"
      "Do you want to view the queue monitoring screen?",
      quickReplies: const ["View Queue Details", "Join Queue", "Back to menu"],
    );
  }

  void _replyUpcomingAppointments() {
    final appState = context.read<AppState>();
    final list = appState.upcomingAppointments;

    if (list.isEmpty) {
      appState.addBotText(
        "You have no upcoming appointments right now.\nDo you want to book one?",
        quickReplies: const ["Book Appointment", "Back to menu"],
      );
      return;
    }

    final next = list.first;
    appState.addBotText(
      "📅 Next Appointment\n\n"
      "Doctor: ${next.doctorName}\n"
      "Department: ${next.departmentName}\n"
      "Date: ${_datePill(next.date)}\n"
      "Time: ${next.timeLabel}\n\n"
      "Want to book another appointment?",
      quickReplies: const ["Book Appointment", "Back to menu"],
    );
  }

  /* -----------------------
     INTENT HANDLER (UPDATED)
  ----------------------- */
  Future<void> _handleIntent(String lower) async {
    // if flow is active, treat message as answer
    if (_mode == _FlowMode.booking) {
      await _continueBookingFlow(lower);
      return;
    }
    if (_mode == _FlowMode.queue) {
      await _continueQueueFlow(lower);
      return;
    }

    // start booking chat flow
    if (lower.contains('book appointment') || lower == 'book') {
      _startBookingChatFlow();
      return;
    }

    // start queue chat flow
    if (lower.contains('join queue') ||
        lower.contains('get queue') ||
        lower.contains('queue number') ||
        lower == 'join queue') {
      _startQueueChatFlow();
      return;
    }

    if (lower.contains('queue status') ||
        (lower.contains('queue') && lower.contains('status')) ||
        lower == 'queue') {
      _replyQueueStatus();
      return;
    }

    if (lower.contains('my appointments') ||
        lower.contains('appointments') ||
        lower.contains('appointment status')) {
      _replyUpcomingAppointments();
      return;
    }

    if (lower.contains('departments')) {
      final resp = botResponses['departments']!;
      context.read<AppState>().addBotText(
            resp['message'] as String,
            quickReplies:
                (resp['quickReplies'] as List<dynamic>).cast<String>(),
          );
      return;
    }

    if (lower.contains('view queue details')) {
      widget.onViewQueue();
      return;
    }

    if (lower.contains('back to menu') || lower == 'menu') {
      context.read<AppState>().addBotText(
            botResponses['default']!['message'] as String,
            quickReplies:
                (botResponses['default']!['quickReplies'] as List<dynamic>)
                    .cast<String>(),
          );
      return;
    }

    if (lower.contains('help')) {
      final resp = botResponses['help']!;
      context.read<AppState>().addBotText(
            resp['message'] as String,
            quickReplies:
                (resp['quickReplies'] as List<dynamic>).cast<String>(),
          );
      return;
    }

    // default
    final resp = botResponses['default']!;
    context.read<AppState>().addBotText(
          resp['message'] as String,
          quickReplies: (resp['quickReplies'] as List<dynamic>).cast<String>(),
        );
  }

  void _sendMessage(String text) {
    final msg = text.trim();
    if (msg.isEmpty) return;

    final appState = context.read<AppState>();
    appState.addUserText(msg);
    _inputCtrl.clear();

    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

    // simulate bot response delay
    Timer(const Duration(milliseconds: 450), () async {
      if (!mounted) return;
      final lower = msg.toLowerCase();
      await _handleIntent(lower);
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    });
  }

  void _handleQuickReply(String reply) => _sendMessage(reply);

  @override
  Widget build(BuildContext context) {
    final messages = context.watch<AppState>().messages;

    return Scaffold(
      backgroundColor: Colors.white,
      bottomNavigationBar: const _BottomNavMock(selectedIndex: 2),
      body: SafeArea(
        child: Column(
          children: [
            _Header(),
            Expanded(
              child: ListView.builder(
                controller: _scrollCtrl,
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                itemCount: messages.length,
                itemBuilder: (context, index) {
                  final msg = messages[index];
                  final isBot = msg.sender == ChatSender.bot;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: isBot
                        ? _BotMessageBubble(
                            message: msg.message,
                            time: _formatTime(msg.timestamp),
                            quickReplies: msg.quickReplies,
                            onQuickReply: _handleQuickReply,
                          )
                        : _UserMessageBubble(
                            message: msg.message,
                            time: _formatTime(msg.timestamp),
                          ),
                  );
                },
              ),
            ),
            _InputBar(
              controller: _inputCtrl,
              onSend: () => _sendMessage(_inputCtrl.text),
            ),
          ],
        ),
      ),
    );
  }
}

/* -----------------------
   Helpers (same)
----------------------- */
String _datePill(DateTime d) => "${d.month}/${d.day}/${d.year}";

String _formatTime(DateTime dt) {
  final t = TimeOfDay.fromDateTime(dt);
  final hour = t.hourOfPeriod == 0 ? 12 : t.hourOfPeriod;
  final min = t.minute.toString().padLeft(2, '0');
  final suffix = t.period == DayPeriod.am ? 'AM' : 'PM';
  return "$hour:$min $suffix";
}

/* -----------------------
   HEADER
----------------------- */
class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: Color(0xFFEFF6FF),
              shape: BoxShape.circle,
            ),
            child:
                const Icon(Icons.smart_toy_outlined, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("AI Assistant",
                    style:
                        TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.circle, size: 8, color: Color(0xFF22C55E)),
                    SizedBox(width: 6),
                    Text("Online",
                        style: TextStyle(
                            color: AppColors.textMuted,
                            fontWeight: FontWeight.w700,
                            fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/* -----------------------
   BUBBLES
----------------------- */
class _BotMessageBubble extends StatelessWidget {
  final String message;
  final String time;
  final List<String> quickReplies;
  final void Function(String) onQuickReply;

  const _BotMessageBubble({
    required this.message,
    required this.time,
    required this.quickReplies,
    required this.onQuickReply,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: const BoxDecoration(
            color: Color(0xFFEFF6FF),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.smart_toy_outlined,
              color: AppColors.primary, size: 18),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text(
                  message,
                  style: const TextStyle(
                      fontSize: 13, height: 1.25, color: AppColors.textDark),
                ),
              ),
              const SizedBox(height: 4),
              Text(time,
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textMuted)),
              if (quickReplies.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: quickReplies.map((r) {
                    return InkWell(
                      borderRadius: BorderRadius.circular(999),
                      onTap: () => onQuickReply(r),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Text(
                          r,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _UserMessageBubble extends StatelessWidget {
  final String message;
  final String time;

  const _UserMessageBubble({
    required this.message,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  message,
                  style: const TextStyle(
                      fontSize: 13,
                      height: 1.25,
                      color: Colors.white,
                      fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 4),
              Text(time,
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textMuted)),
            ],
          ),
        ),
        const SizedBox(width: 10),
        Container(
          width: 34,
          height: 34,
          decoration: const BoxDecoration(
            color: Color(0xFFE5E7EB),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.person_outline,
              color: Color(0xFF475569), size: 18),
        ),
      ],
    );
  }
}

/* -----------------------
   INPUT BAR
----------------------- */
class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onSend;

  const _InputBar({
    required this.controller,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => onSend(),
              decoration: InputDecoration(
                hintText: "Type your message...",
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                enabledBorder: OutlineInputBorder(
                  borderSide: const BorderSide(color: AppColors.border),
                  borderRadius: BorderRadius.circular(12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide:
                      const BorderSide(color: AppColors.primary, width: 1.3),
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onSend,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child:
                  const Icon(Icons.send_rounded, color: Colors.white, size: 20),
            ),
          )
        ],
      ),
    );
  }
}

/* -----------------------
   BOTTOM NAV (mock)
----------------------- */
class _BottomNavMock extends StatelessWidget {
  final int selectedIndex;
  const _BottomNavMock({required this.selectedIndex});

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: selectedIndex,
      type: BottomNavigationBarType.fixed,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: const Color(0xFF64748B),
      onTap: (i) {
        if (i == 0) Navigator.pushNamed(context, AppRoutes.dashboard);
        if (i == 1) Navigator.pushNamed(context, AppRoutes.appointments);
        if (i == 2) Navigator.pushNamed(context, AppRoutes.chatBot);
        if (i == 3) Navigator.pushNamed(context, AppRoutes.queueMonitoring);
        if (i == 4) Navigator.pushNamed(context, AppRoutes.profile);
      },
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: "Home"),
        BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today_outlined), label: "Appointments"),
        BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline), label: "Chatbot"),
        BottomNavigationBarItem(
            icon: Icon(Icons.confirmation_number_outlined), label: "Queue"),
        BottomNavigationBarItem(
            icon: Icon(Icons.person_outline), label: "Profile"),
      ],
    );
  }
}
