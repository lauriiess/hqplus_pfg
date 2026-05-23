import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';
import '../models/clinic_models.dart';
import '../models/appointment_models.dart';
import '../models/queue_models.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int navIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().fetchClinics();
      context.read<AppState>().fetchAppointments();
      context.read<AppState>().fetchQueueStatus();
    });
  }

  Future<void> _goToJoinQueue() async {
    final result = await Navigator.pushNamed(context, AppRoutes.joinQueue);
    if (!mounted) return;
    if (result is QueueJoinResult) {
      context.read<AppState>().addQueueFromJoinResult(result);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Joined queue: ${result.queueNumber}')));
    }
  }

  Future<void> _goToBookAppointment() async {
    final result = await Navigator.pushNamed(context, AppRoutes.bookAppointment);
    if (!mounted) return;
    if (result is Appointment) {
      context.read<AppState>().addAppointment(result);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Appointment booked!')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final user     = appState.currentUser;
    final clinics  = appState.clinics;
    final selected = appState.selectedClinic;
    final queues   = appState.activeQueues;
    final appts    = appState.upcomingAppointments;
    final nextAppt = appts.isNotEmpty ? appts.first : null;

    final pages = [
      _buildHome(appState, user?.fullName ?? 'Patient', clinics, selected, queues, nextAppt, appts.length),
      const Center(child: Text('Queue', style: TextStyle(fontSize: 20))),
      const Center(child: Text('Appointments', style: TextStyle(fontSize: 20))),
      const Center(child: Text('Profile', style: TextStyle(fontSize: 20))),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: IndexedStack(index: navIndex, children: [
        pages[0],
        _QueueTab(),
        _AppointmentsTab(),
        _ProfileTab(),
      ]),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: navIndex,
        onTap: (i) => setState(() => navIndex = i),
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.confirmation_number_outlined), activeIcon: Icon(Icons.confirmation_number), label: 'Queue'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month_outlined), activeIcon: Icon(Icons.calendar_month), label: 'Appointments'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildHome(AppState appState, String name, List<Clinic> clinics,
      Clinic? selected, List<QueueEntry> queues, Appointment? nextAppt, int apptCount) {
    return SafeArea(child: Column(children: [
      _Header(name: name, onBellTap: () {}),
      Expanded(child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

          // ── Clinic Selector ─────────────────────────────────────────────
          const Text('Select Clinic', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
          const SizedBox(height: 8),
          SizedBox(height: 110, child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: clinics.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) => _ClinicCard(
              clinic: clinics[i],
              isSelected: selected?.id == clinics[i].id,
              onTap: () => appState.selectClinic(clinics[i]),
            ),
          )),

          const SizedBox(height: 18),

          // ── Quick actions ─────────────────────────────────────────────
          Row(children: [
            Expanded(child: _QuickActionCard(
              filled: true, icon: Icons.calendar_month_outlined,
              title: 'Book Appointment', onTap: _goToBookAppointment)),
            const SizedBox(width: 12),
            Expanded(child: _QuickActionCard(
              filled: false, icon: Icons.confirmation_number_outlined,
              title: 'Get Queue Number', onTap: _goToJoinQueue)),
          ]),

          const SizedBox(height: 18),

          // ── Selected clinic services ───────────────────────────────────
          if (selected != null) ...[
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Services Available', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              Text('${selected.currentWaitingTime} min wait',
                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 13)),
            ]),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8,
              children: selected.services.map((s) => _ServiceChip(name: s)).toList()),
            const SizedBox(height: 18),
          ],

          // ── Current Status ────────────────────────────────────────────
          const Text('Current Status', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
          const SizedBox(height: 10),

          if (queues.isEmpty && nextAppt == null)
            const _StatusEmptyCard()
          else ...[
            if (queues.isNotEmpty)
              _SwipeQueuesSection(queues: queues,
                onViewAll: () => Navigator.pushNamed(context, AppRoutes.queueMonitoring)),
            if (queues.isNotEmpty && nextAppt != null) const SizedBox(height: 12),
            if (nextAppt != null) ...[
              _NextAppointmentCard(appt: nextAppt),
              if (apptCount > 1) ...[
                const SizedBox(height: 10),
                InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => Navigator.pushNamed(context, AppRoutes.appointments),
                  child: Container(
                    width: double.infinity, padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border)),
                    child: Row(children: [
                      const Icon(Icons.event_note_outlined, color: AppColors.primary),
                      const SizedBox(width: 10),
                      Expanded(child: Text('You have ${apptCount - 1} more upcoming appointment${apptCount - 1 == 1 ? "" : "s"}',
                        style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark))),
                      const Text('View all ›', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary)),
                    ]),
                  ),
                ),
              ],
            ],
          ],

          const SizedBox(height: 18),
          // ── Chatbot button ────────────────────────────────────────────
          InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => Navigator.pushNamed(context, AppRoutes.chatBot),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.bgTop, AppColors.bgBottom]),
                borderRadius: BorderRadius.circular(14)),
              child: const Row(children: [
                Icon(Icons.smart_toy_outlined, color: Colors.white, size: 28),
                SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('AI Health Assistant', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                  Text('Ask about queue, appointments, services', style: TextStyle(color: Colors.white70, fontSize: 12)),
                ])),
                Icon(Icons.arrow_forward_ios_rounded, color: Colors.white70, size: 16),
              ]),
            ),
          ),
        ]),
      )),
    ]));
  }
}

// ── Clinic Card ───────────────────────────────────────────────────────────────
class _ClinicCard extends StatelessWidget {
  final Clinic clinic;
  final bool isSelected;
  final VoidCallback onTap;
  const _ClinicCard({required this.clinic, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 200,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isSelected ? AppColors.primary : AppColors.border, width: 2),
          boxShadow: isSelected ? [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0,4))] : [],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.local_hospital_rounded, color: isSelected ? Colors.white : AppColors.primary, size: 18),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: clinic.queueLength > 8 ? Colors.red.withOpacity(0.15) : Colors.green.withOpacity(0.15),
                borderRadius: BorderRadius.circular(99)),
              child: Text('${clinic.currentWaitingTime}m wait',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                  color: clinic.queueLength > 8 ? Colors.red : Colors.green)),
            ),
          ]),
          const SizedBox(height: 8),
          Text(clinic.name.replaceAll('Hi-Precision Diagnostics - ', ''),
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13,
              color: isSelected ? Colors.white : AppColors.textDark),
            maxLines: 2, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 4),
          Text('${clinic.distanceKm} km · ${clinic.queueLength} in queue',
            style: TextStyle(fontSize: 11, color: isSelected ? Colors.white70 : AppColors.textMuted)),
        ]),
      ),
    );
  }
}

class _ServiceChip extends StatelessWidget {
  final String name;
  const _ServiceChip({required this.name});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    decoration: BoxDecoration(
      color: AppColors.primary.withOpacity(0.08),
      borderRadius: BorderRadius.circular(99),
      border: Border.all(color: AppColors.primary.withOpacity(0.2))),
    child: Text(name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)));
}

// ── Header ────────────────────────────────────────────────────────────────────
class _Header extends StatelessWidget {
  final String name;
  final VoidCallback onBellTap;
  const _Header({required this.name, required this.onBellTap});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
    decoration: const BoxDecoration(
      gradient: LinearGradient(colors: [AppColors.bgTop, AppColors.bgBottom]),
      borderRadius: BorderRadius.only(bottomLeft: Radius.circular(20), bottomRight: Radius.circular(20))),
    child: Row(children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Hi, ${name.split(' ').first} 👋', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
        const Text('How can we help you today?', style: TextStyle(color: Colors.white70, fontSize: 13)),
      ])),
      IconButton(icon: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 26), onPressed: onBellTap),
    ]));
}

class _QuickActionCard extends StatelessWidget {
  final bool filled;
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  const _QuickActionCard({required this.filled, required this.icon, required this.title, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: filled ? AppColors.primary : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: filled ? AppColors.primary : AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8, offset: const Offset(0,2))]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: filled ? Colors.white : AppColors.primary, size: 26),
        const SizedBox(height: 8),
        Text(title, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13,
          color: filled ? Colors.white : AppColors.textDark)),
      ])));
}

class _StatusEmptyCard extends StatelessWidget {
  const _StatusEmptyCard();
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity, padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border)),
    child: const Column(children: [
      Icon(Icons.inbox_outlined, size: 40, color: AppColors.textMuted),
      SizedBox(height: 10),
      Text('No active queue or appointments', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textDark)),
      SizedBox(height: 4),
      Text('Book an appointment or join a queue to get started.',
        textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
    ]));
}

class _SwipeQueuesSection extends StatelessWidget {
  final List<QueueEntry> queues;
  final VoidCallback onViewAll;
  const _SwipeQueuesSection({required this.queues, required this.onViewAll});
  @override
  Widget build(BuildContext context) => Column(children: [
    ...queues.map((q) => Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: _QueueCard(entry: q),
    )),
    TextButton(onPressed: onViewAll, child: const Text('View Queue Details ›')),
  ]);
}

class _QueueCard extends StatelessWidget {
  final QueueEntry entry;
  const _QueueCard({required this.entry});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border)),
    child: Row(children: [
      Container(width: 50, height: 50,
        decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
        child: Center(child: Text(entry.queueNumber,
          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w900, fontSize: 11)))),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(entry.clinicName, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark, fontSize: 13),
          maxLines: 1, overflow: TextOverflow.ellipsis),
        Text(entry.serviceName, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
      ])),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text('~${entry.estimatedWaitTimeMinutes} min',
          style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
        Text('${entry.position} ahead', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
      ]),
    ]));
}

class _NextAppointmentCard extends StatelessWidget {
  final Appointment appt;
  const _NextAppointmentCard({required this.appt});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      gradient: const LinearGradient(colors: [Color(0xFFEFF6FF), Color(0xFFDBEAFE)]),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.primary.withOpacity(0.2))),
    child: Row(children: [
      const Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 28),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(appt.clinicName, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark),
          maxLines: 1, overflow: TextOverflow.ellipsis),
        Text(appt.serviceName, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
        Text('${appt.date.day}/${appt.date.month}/${appt.date.year} · ${appt.timeLabel}',
          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 12)),
      ])),
    ]));
}

// ── Tab placeholders that redirect to proper screens ─────────────────────────
class _QueueTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.pushNamed(context, AppRoutes.queueMonitoring);
    });
    return const SizedBox.shrink();
  }
}
class _AppointmentsTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.pushNamed(context, AppRoutes.appointments);
    });
    return const SizedBox.shrink();
  }
}
class _ProfileTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.pushNamed(context, AppRoutes.profile);
    });
    return const SizedBox.shrink();
  }
}
