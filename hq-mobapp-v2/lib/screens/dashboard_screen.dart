import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../services/clinic_service.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';
// models
import '../models/appointment_models.dart' as apt;
import '../models/queue_models.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String? expandedDepartmentId;
  int navIndex = 0;

  Future<void> _goToBookAppointment() async {
    final result =
        await Navigator.pushNamed(context, AppRoutes.bookAppointment);
    if (!mounted) return;

    if (result is apt.Appointment) {
      context.read<AppState>().addAppointment(result);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Appointment booked.")),
      );
    }
  }

  Future<void> _goToJoinQueue() async {
    final result = await Navigator.pushNamed(context, AppRoutes.joinQueue);
    if (!mounted) return;

    if (result is QueueJoinResult) {
      context.read<AppState>().addQueueFromJoinResult(result);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Joined queue: ${result.queueNumber}")),
      );
    }
  }

  // picks the nearest upcoming appointment by (date + timeLabel).
  apt.Appointment? _pickNearestAppointment(List<apt.Appointment> appts) {
    if (appts.isEmpty) return null;

    DateTime toDateTime(apt.Appointment a) {
      final base = DateTime(a.date.year, a.date.month, a.date.day);
      final t = _parseTimeLabel(a.timeLabel);
      return DateTime(base.year, base.month, base.day, t.hour, t.minute);
    }

    final sorted = [...appts]
      ..sort((a, b) => toDateTime(a).compareTo(toDateTime(b)));
    return sorted.first;
  }

  TimeOfDay _parseTimeLabel(String label) {
    final s = label.trim().toUpperCase();
    final parts = s.split(RegExp(r'\s+'));
    final hm = parts.first.split(':');
    int hour = int.tryParse(hm[0]) ?? 0;
    final minute = int.tryParse(hm.length > 1 ? hm[1] : '0') ?? 0;
    final isPm = parts.length > 1 && parts[1] == 'PM';

    if (isPm && hour != 12) hour += 12;
    if (!isPm && hour == 12) hour = 0;

    return TimeOfDay(hour: hour, minute: minute);
  }

  // if AppState does not have activeQueues/queues, it will fall back to currentQueue only.
  List<QueueEntry> _getActiveQueues(AppState appState) {
    try {
      final dynamic dyn = appState;
      final list = dyn.activeQueues;
      if (list is List<QueueEntry>) return list;
    } catch (_) {}

    try {
      final dynamic dyn = appState;
      final list = dyn.queues;
      if (list is List<QueueEntry>) return list;
    } catch (_) {}

    final q = appState.currentQueue;
    return q == null ? <QueueEntry>[] : <QueueEntry>[q];
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    // appointments
    final appts = appState.upcomingAppointments;
    final nextAppt = _pickNearestAppointment(appts);
    final moreApptCount =
        appts.isNotEmpty ? (appts.length - 1).clamp(0, 9999) : 0;

    // queues (supports multiple + swipe)
    final queues = _getActiveQueues(appState);
    final hasQueues = queues.isNotEmpty;

    final hasActiveStatus = appts.isNotEmpty || hasQueues;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: SafeArea(
        child: Column(
          children: [
            _Header(
              subtitle: hasActiveStatus
                  ? "Here’s your latest appointment/queue updates."
                  : "How can we help you today?",
              onBellTap: () {},
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _QuickActionCard(
                            filled: true,
                            icon: Icons.calendar_month_outlined,
                            title: "Book Appointment",
                            onTap: _goToBookAppointment,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _QuickActionCard(
                            filled: false,
                            icon: Icons.confirmation_number_outlined,
                            title: "Get Queue Number",
                            onTap: _goToJoinQueue,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    const Text(
                      "Current Status",
                      style: TextStyle(
                        color: AppColors.textDark,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // ✅ empty state
                    if (!hasQueues && nextAppt == null)
                      const _StatusEmptyCard()
                    else ...[
                      // ✅ queues (swipeable + no overflow)
                      if (hasQueues) ...[
                        _SwipeQueuesSection(
                          queues: queues,
                          onViewAll: () => Navigator.pushNamed(
                              context, AppRoutes.queueMonitoring),
                        ),
                      ],

                      // ✅ spacing between queues and appointment
                      if (hasQueues && nextAppt != null)
                        const SizedBox(height: 12),

                      // ✅ appointment (NOT LOST anymore)
                      if (nextAppt != null) ...[
                        _NextAppointmentCard(appt: nextAppt),
                        if (moreApptCount > 0) ...[
                          const SizedBox(height: 10),
                          InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () => Navigator.pushNamed(
                                context, AppRoutes.appointments),
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.event_note_outlined,
                                      color: AppColors.primary),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      "You have $moreApptCount more upcoming appointment${moreApptCount == 1 ? "" : "s"}",
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.textDark,
                                      ),
                                    ),
                                  ),
                                  const Text(
                                    "View all ›",
                                    style: TextStyle(
                                      fontWeight: FontWeight.w900,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ],

                    const SizedBox(height: 18),

                    const Text(
                      "Nearby Clinics",
                      style: TextStyle(
                        color: AppColors.textDark,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),

                    const SizedBox(
                      height: 440,
                      child: Container(),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: navIndex,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: const Color(0xFF64748B),
        onTap: (i) {
          setState(() => navIndex = i);

          if (i == 0) return;
          if (i == 1) {
            Navigator.pushNamed(context, AppRoutes.appointments);
            return;
          }
          if (i == 2) {
            Navigator.pushNamed(context, AppRoutes.chatBot);
            return;
          }
          if (i == 3) {
            Navigator.pushNamed(context, AppRoutes.queueMonitoring);
            return;
          }
          if (i == 4) {
            Navigator.pushNamed(context, AppRoutes.profile);
            return;
          }
        },
        items: const [
          BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined), label: "Home"),
          BottomNavigationBarItem(
              icon: Icon(Icons.calendar_today_outlined), label: "Appoinments"),
          BottomNavigationBarItem(
              icon: Icon(Icons.chat_bubble_outline), label: "Chatbot"),
          BottomNavigationBarItem(
              icon: Icon(Icons.confirmation_number_outlined), label: "Queue"),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: "Profile"),
        ],
      ),
    );
  }
}

/* --------------------------
   HEADER
-------------------------- */
class _Header extends StatelessWidget {
  final VoidCallback onBellTap;
  final String subtitle;

  const _Header({
    required this.onBellTap,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Welcome!",
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textDark,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onBellTap,
            icon: const Icon(Icons.notifications_none),
            color: AppColors.textDark,
          ),
        ],
      ),
    );
  }
}

/* --------------------------
   QUICK ACTIONS
-------------------------- */
class _QuickActionCard extends StatelessWidget {
  final bool filled;
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.filled,
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bg = filled ? AppColors.primary : Colors.white;
    final fg = filled ? Colors.white : AppColors.primary;

    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 14),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
          border:
              filled ? null : Border.all(color: AppColors.primary, width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 14,
              offset: const Offset(0, 8),
            )
          ],
        ),
        child: Column(
          children: [
            Icon(icon, color: fg, size: 28),
            const SizedBox(height: 10),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: fg,
                fontWeight: FontWeight.w800,
                fontSize: 12.5,
              ),
            )
          ],
        ),
      ),
    );
  }
}

/* --------------------------
   STATUS CARDS
-------------------------- */

class _StatusEmptyCard extends StatelessWidget {
  const _StatusEmptyCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          const Text(
            "No active appointments or queue\nnumbers",
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Book an appointment or get a queue\nnumber to get started",
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted.withOpacity(0.85)),
          ),
        ],
      ),
    );
  }
}

/// ✅ FIXED: swipeable queues section (responsive height + scrollable page content)
class _SwipeQueuesSection extends StatefulWidget {
  final List<QueueEntry> queues;
  final VoidCallback onViewAll;

  const _SwipeQueuesSection({
    required this.queues,
    required this.onViewAll,
  });

  @override
  State<_SwipeQueuesSection> createState() => _SwipeQueuesSectionState();
}

class _SwipeQueuesSectionState extends State<_SwipeQueuesSection> {
  final PageController _page = PageController(viewportFraction: 0.94);
  int _index = 0;

  @override
  void dispose() {
    _page.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final queues = widget.queues;
    final count = queues.length;

    // ✅ responsive height (prevents appointment looking "lost")
    final pageHeight = 290.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              "Active Queues",
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: AppColors.textDark,
              ),
            ),
            const Spacer(),
            if (count > 1)
              Text(
                "${_index + 1}/$count",
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w800,
                ),
              ),
            const SizedBox(width: 10),
            InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: widget.onViewAll,
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: Text(
                  "View all ›",
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: pageHeight,
          child: PageView.builder(
            controller: _page,
            itemCount: count,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (context, i) {
              final q = queues[i];

              // ✅ scrollable inside each page so it never overflows
              return Padding(
                padding: const EdgeInsets.only(right: 10),
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _ActiveQueueCard(queue: q),
                      const SizedBox(height: 10),
                      _QueueAlertNotification(queue: q),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        if (count > 1) ...[
          const SizedBox(height: 8),
          _DotsIndicator(count: count, index: _index),
        ],
      ],
    );
  }
}

class _DotsIndicator extends StatelessWidget {
  final int count;
  final int index;

  const _DotsIndicator({required this.count, required this.index});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) {
        final active = i == index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          curve: Curves.easeOut,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: active ? 18 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: active ? AppColors.primary : AppColors.border,
            borderRadius: BorderRadius.circular(999),
          ),
        );
      }),
    );
  }
}

class _ActiveQueueCard extends StatelessWidget {
  final QueueEntry queue;
  const _ActiveQueueCard({required this.queue});

  bool get isPriority => queue.queueType == QueueType.priority;

  @override
  Widget build(BuildContext context) {
    final accent = isPriority ? const Color(0xFFF59E0B) : AppColors.primary;
    final bg = accent.withOpacity(0.12);
    final progress =
        (queue.position / (queue.position + queue.totalAhead)).clamp(0.05, 1.0);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.bolt, color: accent),
              const SizedBox(width: 8),
              Text(
                "Active Queue",
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: accent,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: accent,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  isPriority ? "Priority" : "Regular",
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              queue.queueNumber,
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.w900,
                color: accent,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: Text(
              queue.departmentName,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _QueueMeta(label: "Position", value: "${queue.position}"),
              _QueueMeta(
                  label: "Est. Wait",
                  value: "${queue.estimatedWaitTimeMinutes} mins"),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: Colors.white.withOpacity(0.6),
              color: accent,
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              "${queue.totalAhead} people ahead",
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Center(
            child: TextButton(
              onPressed: () =>
                  Navigator.pushNamed(context, AppRoutes.queueMonitoring),
              child: Text(
                "View Details ›",
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: accent,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QueueMeta extends StatelessWidget {
  final String label;
  final String value;
  const _QueueMeta({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textMuted,
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}

class _NextAppointmentCard extends StatelessWidget {
  final apt.Appointment appt;
  const _NextAppointmentCard({required this.appt});

  String _datePill(DateTime d) => "${d.month}/${d.day}/${d.year}";

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Next Appointment",
            style: TextStyle(
              fontWeight: FontWeight.w900,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            appt.doctorName,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          Text(
            appt.departmentName,
            style: const TextStyle(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: [
              _Pill(_datePill(appt.date)),
              _Pill(appt.timeLabel),
            ],
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String text;
  const _Pill(this.text);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(
        text,
        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
      ),
    );
  }
}

/* --------------------------
   DEPARTMENT GRID
-------------------------- */
