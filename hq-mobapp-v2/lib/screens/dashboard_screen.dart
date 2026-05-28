import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/clinic_service.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';
import '../models/appointment_models.dart' as apt;
import '../models/queue_models.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int navIndex = 0;
  List<Clinic> _nearbyClinics = [];
  bool _clinicsLoading = true;

  @override
  void initState() {
    super.initState();
    _loadClinics();
    // Refresh queue & appointments every time dashboard is shown
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final s = context.read<AppState>();
      s.fetchQueueStatus();
      s.fetchAppointments();
    });
  }

  Future<void> _loadClinics() async {
    try {
      final list = await ClinicService.getDirectory();
      if (mounted) setState(() { _nearbyClinics = list; _clinicsLoading = false; });
    } catch (_) {
      if (mounted) setState(() => _clinicsLoading = false);
    }
  }

  Future<void> _goToBookAppointment() async {
    final result = await Navigator.pushNamed(context, AppRoutes.bookAppointment);
    if (!mounted) return;
    if (result is apt.Appointment) {
      context.read<AppState>().addAppointment(result);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Appointment booked.')));
    }
  }

  Future<void> _goToJoinQueue() async {
    final result = await Navigator.pushNamed(context, AppRoutes.joinQueue);
    if (!mounted) return;
    if (result is QueueJoinResult) {
      context.read<AppState>().addQueueFromJoinResult(result);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Joined queue: ${result.queueNumber}')));
    }
    // Always refresh after returning from queue join
    if (mounted) context.read<AppState>().fetchQueueStatus();
  }

  apt.Appointment? _pickNearest(List<apt.Appointment> appts) {
    if (appts.isEmpty) return null;
    TimeOfDay parseTime(String label) {
      final s = label.trim().toUpperCase();
      final parts = s.split(RegExp(r'\s+'));
      final hm = parts.first.split(':');
      int h = int.tryParse(hm[0]) ?? 0;
      final m = int.tryParse(hm.length > 1 ? hm[1] : '0') ?? 0;
      final pm = parts.length > 1 && parts[1] == 'PM';
      if (pm && h != 12) h += 12;
      if (!pm && h == 12) h = 0;
      return TimeOfDay(hour: h, minute: m);
    }
    DateTime toDT(apt.Appointment a) {
      final t = parseTime(a.timeLabel);
      return DateTime(a.date.year, a.date.month, a.date.day, t.hour, t.minute);
    }
    return ([...appts]..sort((a, b) => toDT(a).compareTo(toDT(b)))).first;
  }

  @override
  Widget build(BuildContext context) {
    final appState  = context.watch<AppState>();
    final user      = appState.currentUser;
    final queues    = appState.activeQueues;
    final appts     = appState.upcomingAppointments;
    final nextAppt  = _pickNearest(appts);
    final moreCnt   = appts.isNotEmpty ? (appts.length - 1).clamp(0, 9999) : 0;
    final hasStatus = queues.isNotEmpty || appts.isNotEmpty;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: SafeArea(
        child: Column(children: [
          _Header(
            userName: user?.fullName.split(' ').first ?? 'Patient',
            subtitle: hasStatus
                ? "Here's your latest updates."
                : "How can we help you today?",
            onBellTap: () => Navigator.pushNamed(context, AppRoutes.profile),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                await Future.wait([
                  appState.fetchQueueStatus(),
                  appState.fetchAppointments(),
                  _loadClinics(),
                ]);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Quick actions ──────────────────────────────
                    Row(children: [
                      Expanded(child: _QuickAction(
                        filled: true, icon: Icons.calendar_month_outlined,
                        title: 'Book Appointment', onTap: _goToBookAppointment,
                      )),
                      const SizedBox(width: 12),
                      Expanded(child: _QuickAction(
                        filled: false, icon: Icons.confirmation_number_outlined,
                        title: 'Get Queue Number', onTap: _goToJoinQueue,
                      )),
                    ]),

                    const SizedBox(height: 20),

                    // ── Current Status ─────────────────────────────
                    const Text('Current Status',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800,
                          color: AppColors.textDark)),
                    const SizedBox(height: 10),

                    if (!hasStatus)
                      _EmptyStatus(
                        onBook: _goToBookAppointment,
                        onQueue: _goToJoinQueue,
                      )
                    else ...[
                      if (queues.isNotEmpty)
                        ...queues.map((q) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _QueueCard(entry: q),
                        )),
                      if (nextAppt != null) ...[
                        _AppointmentCard(appt: nextAppt),
                        if (moreCnt > 0) ...[
                          const SizedBox(height: 10),
                          _MoreApptsBar(count: moreCnt,
                            onTap: () => Navigator.pushNamed(context, AppRoutes.appointments)),
                        ],
                      ],
                    ],

                    const SizedBox(height: 20),

                    // ── Nearby Clinics ─────────────────────────────
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Nearby Clinics',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800,
                              color: AppColors.textDark)),
                        TextButton(
                          onPressed: () => Navigator.pushNamed(context, AppRoutes.joinQueue),
                          child: const Text('See all'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    if (_clinicsLoading)
                      const Center(child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(),
                      ))
                    else if (_nearbyClinics.isEmpty)
                      const _EmptyCard(message: 'No clinics available right now.')
                    else
                      Column(children: _nearbyClinics.take(5).map((c) =>
                        _ClinicCard(clinic: c, onJoin: () async {
                          await Navigator.pushNamed(context, AppRoutes.joinQueue,
                            arguments: c);
                          if (mounted) context.read<AppState>().fetchQueueStatus();
                        })
                      ).toList()),
                  ],
                ),
              ),
            ),
          ),
        ]),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: navIndex,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: const Color(0xFF64748B),
        onTap: (i) {
          setState(() => navIndex = i);
          switch (i) {
            case 0: break;
            case 1: Navigator.pushNamed(context, AppRoutes.appointments); break;
            case 2: Navigator.pushNamed(context, AppRoutes.chatBot);      break;
            case 3: Navigator.pushNamed(context, AppRoutes.queueMonitoring); break;
            case 4: Navigator.pushNamed(context, AppRoutes.profile);      break;
          }
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today_outlined),
            activeIcon: Icon(Icons.calendar_today), label: 'Appointments'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline),
            activeIcon: Icon(Icons.chat_bubble), label: 'Chat'),
          BottomNavigationBarItem(icon: Icon(Icons.queue_outlined),
            activeIcon: Icon(Icons.queue), label: 'Queue'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

// ── Widgets ────────────────────────────────────────────────────────

class _Header extends StatelessWidget {
  final String userName;
  final String subtitle;
  final VoidCallback onBellTap;
  const _Header({required this.userName, required this.subtitle, required this.onBellTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.primary,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Hi, $userName!',
            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(subtitle,
            style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13)),
        ])),
        IconButton(
          icon: const Icon(Icons.notifications_outlined, color: Colors.white),
          onPressed: onBellTap,
        ),
      ]),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final bool filled;
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  const _QuickAction({required this.filled, required this.icon, required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 14),
        decoration: BoxDecoration(
          color: filled ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: filled ? null : Border.all(color: AppColors.border),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: filled ? Colors.white : AppColors.primary, size: 26),
          const SizedBox(height: 10),
          Text(title,
            style: TextStyle(
              color: filled ? Colors.white : AppColors.textDark,
              fontWeight: FontWeight.w700, fontSize: 13)),
        ]),
      ),
    );
  }
}

class _EmptyStatus extends StatelessWidget {
  final VoidCallback onBook;
  final VoidCallback onQueue;
  const _EmptyStatus({required this.onBook, required this.onQueue});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(children: [
        Icon(Icons.inbox_outlined, size: 40, color: AppColors.textMuted),
        const SizedBox(height: 10),
        const Text('No active appointments or queues',
          style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textDark)),
        const SizedBox(height: 4),
        const Text('Book an appointment or get a queue number to get started.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: OutlinedButton(onPressed: onBook,
            child: const Text('Book Appointment'))),
          const SizedBox(width: 10),
          Expanded(child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary,
              foregroundColor: Colors.white),
            onPressed: onQueue, child: const Text('Get Queue #'))),
        ]),
      ]),
    );
  }
}

class _QueueCard extends StatelessWidget {
  final QueueEntry entry;
  const _QueueCard({required this.entry});

  Color get _statusColor {
    switch (entry.status) {
      case QueueStatus.serving:   return const Color(0xFF16A34A);
      case QueueStatus.confirmed: return const Color(0xFF2563EB);
      case QueueStatus.waiting:   return const Color(0xFFD97706);
      default:                    return const Color(0xFF6B7280);
    }
  }

  String get _statusLabel {
    switch (entry.status) {
      case QueueStatus.serving:   return 'Being Served';
      case QueueStatus.confirmed: return 'Confirmed';
      case QueueStatus.waiting:   return 'Waiting';
      case QueueStatus.pending:   return 'Pending';
      default:                    return entry.status.name;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8)],
      ),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.06),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
          ),
          child: Row(children: [
            const Icon(Icons.confirmation_number_outlined, color: AppColors.primary, size: 18),
            const SizedBox(width: 6),
            Expanded(child: Text(
              entry.clinicName.isNotEmpty ? entry.clinicName : 'Queue',
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: _statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(99)),
              child: Text(_statusLabel,
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _statusColor)),
            ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Queue #${entry.queueNumber}',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800,
                    color: AppColors.textDark)),
              if (entry.serviceName.isNotEmpty)
                Text(entry.serviceName,
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('${entry.position} ahead',
                style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textDark)),
              Text('~${entry.estimatedWait} min',
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ]),
          ]),
        ),
      ]),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final apt.Appointment appt;
  const _AppointmentCard({required this.appt});

  @override
  Widget build(BuildContext context) {
    final dateStr = '${appt.date.day}/${appt.date.month}/${appt.date.year}';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8)],
      ),
      child: Row(children: [
        Container(
          width: 46, height: 46,
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.event_outlined, color: AppColors.primary),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(appt.clinicName.isNotEmpty ? appt.clinicName : appt.departmentName,
            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textDark)),
          Text(appt.department.isNotEmpty ? appt.department : appt.serviceName,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          Text('$dateStr  •  ${appt.timeLabel}',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB).withOpacity(0.1),
            borderRadius: BorderRadius.circular(99)),
          child: Text(appt.status.name,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                color: Color(0xFF2563EB))),
        ),
      ]),
    );
  }
}

class _MoreApptsBar extends StatelessWidget {
  final int count;
  final VoidCallback onTap;
  const _MoreApptsBar({required this.count, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity, padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border)),
        child: Row(children: [
          const Icon(Icons.event_note_outlined, color: AppColors.primary),
          const SizedBox(width: 10),
          Expanded(child: Text(
            'You have $count more upcoming appointment${count == 1 ? "" : "s"}',
            style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark))),
          const Text('View all ›',
            style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary)),
        ]),
      ),
    );
  }
}

class _ClinicCard extends StatelessWidget {
  final Clinic clinic;
  final VoidCallback onJoin;
  const _ClinicCard({required this.clinic, required this.onJoin});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8)],
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.08),
            borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.local_hospital_outlined, color: AppColors.primary),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(clinic.name,
            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textDark)),
          Text(clinic.address,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            maxLines: 1, overflow: TextOverflow.ellipsis),
          if ((clinic.queueCount ?? 0) > 0)
            Text('${clinic.queueCount} in queue  •  ~${clinic.waitMinutes ?? 0} min wait',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        ])),
        TextButton(onPressed: onJoin, child: const Text('Join')),
      ]),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  final String message;
  const _EmptyCard({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity, padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border)),
      child: Text(message, textAlign: TextAlign.center,
        style: const TextStyle(color: AppColors.textMuted)),
    );
  }
}
