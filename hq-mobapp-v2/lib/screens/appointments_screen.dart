import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';
// models
import '../models/appointment_models.dart' as apt;

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _tabs.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _bookNew() async {
    final result =
        await Navigator.pushNamed(context, AppRoutes.bookAppointment);

    if (!mounted) return;

    if (result is apt.Appointment) {
      context.read<AppState>().addAppointment(result);
    }
  }

  void _cancel(String appointmentId) {
    context.read<AppState>().updateAppointment(
          appointmentId,
          status: apt.AppointmentStatus.cancelled,
        );
  }

  Future<void> _reschedule(String appointmentId) async {
    final state = context.read<AppState>();

    // find current appointment safely
    apt.Appointment? current;
    for (final a in state.appointments) {
      if (a.id == appointmentId) {
        // ignore: unnecessary_cast
        current = a as apt.Appointment;
        break;
      }
    }
    if (current == null) return;

    final result = await showModalBottomSheet<_RescheduleResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RescheduleSheet(initial: current!),
    );

    if (!mounted || result == null) return;

    // update appointment in AppState
    state.updateAppointment(
      appointmentId,
      date: result.date,
      timeLabel: result.timeLabel,
      notes: result.reason,
      status: apt.AppointmentStatus.scheduled,
    );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Appointment rescheduled successfully.")),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    final upcoming = appState.appointments.where((a) {
      return a.status == apt.AppointmentStatus.scheduled ||
          a.status == apt.AppointmentStatus.confirmed;
    }).toList();

    final past = appState.appointments.where((a) {
      return a.status == apt.AppointmentStatus.completed ||
          a.status == apt.AppointmentStatus.cancelled;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        titleSpacing: 16,
        title: const Padding(
          padding: EdgeInsets.only(top: 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Appointments",
                  style: TextStyle(fontWeight: FontWeight.w900)),
              SizedBox(height: 2),
              Text(
                "Manage your healthcare visits",
                style: TextStyle(
                  fontSize: 12.5,
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppColors.border),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: SizedBox(
              height: 46,
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 0,
                ),
                onPressed: _bookNew,
                icon: const Icon(Icons.add, size: 18),
                label: const Text(
                  "Book New Appointment",
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: _SegmentedTabs(
              selectedIndex: _tabs.index,
              leftLabel: "Upcoming (${upcoming.length})",
              rightLabel: "Past (${past.length})",
              onChanged: (i) => _tabs.animateTo(i),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _ListTab(
                  list: upcoming,
                  emptyTitle: "No Upcoming Appointments",
                  emptySubtitle: "Book your first appointment to get started",
                  onCancel: _cancel,
                  onReschedule: _reschedule,
                ),
                _ListTab(
                  list: past,
                  emptyTitle: "No Past Appointments",
                  emptySubtitle: "Your completed appointments will appear here",
                  onCancel: _cancel,
                  onReschedule: _reschedule,
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: const _BottomNavMock(selectedIndex: 1),
    );
  }
}

/* --------------------------
   Segmented Control Tabs
-------------------------- */
class _SegmentedTabs extends StatelessWidget {
  final int selectedIndex;
  final String leftLabel;
  final String rightLabel;
  final ValueChanged<int> onChanged;

  const _SegmentedTabs({
    required this.selectedIndex,
    required this.leftLabel,
    required this.rightLabel,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 36,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: const Color(0xFFEDEFF2),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        children: [
          Expanded(
            child: _SegItem(
              text: leftLabel,
              selected: selectedIndex == 0,
              onTap: () => onChanged(0),
            ),
          ),
          Expanded(
            child: _SegItem(
              text: rightLabel,
              selected: selectedIndex == 1,
              onTap: () => onChanged(1),
            ),
          ),
        ],
      ),
    );
  }
}

class _SegItem extends StatelessWidget {
  final String text;
  final bool selected;
  final VoidCallback onTap;

  const _SegItem({
    required this.text,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Text(
          text,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 12.5,
            color: selected ? Colors.black : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }
}

class _ListTab extends StatelessWidget {
  final List<apt.Appointment> list;
  final String emptyTitle;
  final String emptySubtitle;
  final void Function(String) onCancel;
  final Future<void> Function(String) onReschedule;

  const _ListTab({
    required this.list,
    required this.emptyTitle,
    required this.emptySubtitle,
    required this.onCancel,
    required this.onReschedule,
  });

  Color _badgeBg(apt.AppointmentStatus s) {
    switch (s) {
      case apt.AppointmentStatus.confirmed:
        return const Color(0xFFDCFCE7);
      case apt.AppointmentStatus.scheduled:
        return const Color(0xFFDBEAFE);
      case apt.AppointmentStatus.inProgress:
        return const Color(0xFFFFEDD5);
      case apt.AppointmentStatus.completed:
        return const Color(0xFFF3F4F6);
      case apt.AppointmentStatus.cancelled:
        return const Color(0xFFFEE2E2);
    }
  }

  Color _badgeFg(apt.AppointmentStatus s) {
    switch (s) {
      case apt.AppointmentStatus.confirmed:
        return const Color(0xFF15803D);
      case apt.AppointmentStatus.scheduled:
        return const Color(0xFF1D4ED8);
      case apt.AppointmentStatus.inProgress:
        return const Color(0xFF9A3412);
      case apt.AppointmentStatus.completed:
        return const Color(0xFF334155);
      case apt.AppointmentStatus.cancelled:
        return const Color(0xFFB91C1C);
    }
  }

  String _statusText(apt.AppointmentStatus s) => s.name;

  String _dateLine(DateTime d) {
    return "${_weekday(d.weekday)}, ${_month(d.month)} ${d.day}, ${d.year}";
  }

  static String _weekday(int w) =>
      const ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][w - 1];

  static String _month(int m) => const [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ][m - 1];

  @override
  Widget build(BuildContext context) {
    if (list.isEmpty) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                const Icon(
                  Icons.calendar_today_outlined,
                  size: 48,
                  color: AppColors.textMuted,
                ),
                const SizedBox(height: 10),
                Text(
                  emptyTitle,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  emptySubtitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
      itemCount: list.length,
      itemBuilder: (context, i) {
        final a = list[i];

        final canActions = a.status == apt.AppointmentStatus.scheduled ||
            a.status == apt.AppointmentStatus.confirmed;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          a.doctorName,
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          a.departmentName,
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontWeight: FontWeight.w700,
                            fontSize: 12.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: _badgeBg(a.status),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      _statusText(a.status),
                      style: TextStyle(
                        color: _badgeFg(a.status),
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _Meta(
                  icon: Icons.calendar_today_outlined, text: _dateLine(a.date)),
              const SizedBox(height: 8),
              _Meta(icon: Icons.access_time, text: a.timeLabel),
              const SizedBox(height: 8),
              _Meta(icon: Icons.location_on_outlined, text: a.serviceName),
              if (a.notes != null && a.notes!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    a.notes!,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12.5,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
              if (canActions) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textDark,
                          side: const BorderSide(color: AppColors.border),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () async => await onReschedule(a.id),
                        icon: const Icon(Icons.refresh_rounded, size: 18),
                        label: const Text(
                          "Reschedule",
                          style: TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFDC2626),
                          side: const BorderSide(color: Color(0xFFDC2626)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () async {
                          final ok = await showDialog<bool>(
                            context: context,
                            builder: (_) => AlertDialog(
                              title: const Text("Cancel Appointment?"),
                              content: const Text(
                                "Are you sure you want to cancel this appointment? This cannot be undone.",
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () =>
                                      Navigator.pop(context, false),
                                  child: const Text("Keep"),
                                ),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFDC2626),
                                    foregroundColor: Colors.white,
                                  ),
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text("Cancel"),
                                ),
                              ],
                            ),
                          );
                          if (ok == true) onCancel(a.id);
                        },
                        icon: const Icon(Icons.close_rounded, size: 18),
                        label: const Text(
                          "Cancel",
                          style: TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _Meta extends StatelessWidget {
  final IconData icon;
  final String text;

  const _Meta({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppColors.textMuted),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
              fontSize: 13,
            ),
          ),
        ),
      ],
    );
  }
}

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

/* ---------------------------
   Reschedule Sheet 
--------------------------- */
class _RescheduleResult {
  final DateTime date;
  final String timeLabel;
  final String? reason;

  _RescheduleResult({required this.date, required this.timeLabel, this.reason});
}

class _RescheduleSheet extends StatefulWidget {
  final apt.Appointment initial;
  const _RescheduleSheet({required this.initial});

  @override
  State<_RescheduleSheet> createState() => _RescheduleSheetState();
}

class _RescheduleSheetState extends State<_RescheduleSheet> {
  late DateTime _date;
  late TimeOfDay _time;
  final _reasonCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _date = DateTime(widget.initial.date.year, widget.initial.date.month,
        widget.initial.date.day);
    _time = _tryParseTimeLabel(widget.initial.timeLabel) ??
        const TimeOfDay(hour: 9, minute: 0);
    _reasonCtrl.text = (widget.initial.notes ?? "");
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  bool _isPastSelection(DateTime d, TimeOfDay t) {
    final now = DateTime.now();
    final chosen = DateTime(d.year, d.month, d.day, t.hour, t.minute);
    return chosen.isBefore(now.add(const Duration(minutes: 1)));
  }

  String _formatDate(DateTime d) {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return "${days[d.weekday - 1]}, ${months[d.month - 1]} ${d.day}, ${d.year}";
  }

  String _formatTime(TimeOfDay t) {
    final loc = MaterialLocalizations.of(context);
    return loc.formatTimeOfDay(t, alwaysUse24HourFormat: false);
  }

  TimeOfDay? _tryParseTimeLabel(String label) {
    try {
      final cleaned = label.trim().toUpperCase();
      final parts = cleaned.split(" ");
      if (parts.length != 2) return null;

      final timePart = parts[0];
      final ampm = parts[1];

      final hm = timePart.split(":");
      if (hm.length != 2) return null;

      int hour = int.parse(hm[0]);
      final int minute = int.parse(hm[1]);

      if (ampm == "PM" && hour != 12) hour += 12;
      if (ampm == "AM" && hour == 12) hour = 0;

      return TimeOfDay(hour: hour, minute: minute);
    } catch (_) {
      return null;
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date.isBefore(now) ? now : _date,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 2),
    );
    if (picked == null) return;

    setState(() {
      _date = DateTime(picked.year, picked.month, picked.day);
    });
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _time,
    );
    if (picked == null) return;

    setState(() {
      _time = picked;
    });
  }

  void _submit() {
    if (_isPastSelection(_date, _time)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please choose a future date/time.")),
      );
      return;
    }

    Navigator.pop(
      context,
      _RescheduleResult(
        date: _date,
        timeLabel: _formatTime(_time),
        reason: _reasonCtrl.text,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Container(
        padding: EdgeInsets.only(bottom: bottom),
        child: Container(
          margin: const EdgeInsets.fromLTRB(12, 12, 12, 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      "Reschedule Appointment",
                      style:
                          TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                "${widget.initial.doctorName} • ${widget.initial.departmentName}",
                style: const TextStyle(
                    color: AppColors.textMuted, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 14),
              _PickRow(
                icon: Icons.calendar_today_outlined,
                title: "New Date",
                value: _formatDate(_date),
                onTap: _pickDate,
              ),
              const SizedBox(height: 10),
              _PickRow(
                icon: Icons.access_time,
                title: "New Time",
                value: _formatTime(_time),
                onTap: _pickTime,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _reasonCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: "Reason / Notes (optional)",
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        BorderSide(color: AppColors.primary.withOpacity(0.9)),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  onPressed: _submit,
                  child: const Text(
                    "Confirm Reschedule",
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PickRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final VoidCallback onTap;

  const _PickRow({
    required this.icon,
    required this.title,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          color: const Color(0xFFF8FAFC),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppColors.textMuted),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontWeight: FontWeight.w900, fontSize: 12)),
                  const SizedBox(height: 3),
                  Text(value,
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
