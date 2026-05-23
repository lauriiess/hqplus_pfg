import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';
import '../models/clinic_models.dart';
import '../models/appointment_models.dart';
import '../models/queue_models.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SCREEN (shell with bottom nav)
// ─────────────────────────────────────────────────────────────────────────────
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _navIndex = 0;

  void _onTabChange(int index) {
    setState(() => _navIndex = index);
    // Re-fetch fresh data whenever switching to Appointments (1) or Queue tabs
    final s = context.read<AppState>();
    if (index == 1) s.fetchAppointments();
    if (index == 0) s.fetchQueueStatus();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final s = context.read<AppState>();
      s.fetchClinics();
      s.fetchAppointments();
      s.fetchQueueStatus();
    });
  }

  // ── Navigation helpers ────────────────────────────────────────────────────
  Future<void> _goToJoinQueue() async {
    final result = await Navigator.pushNamed(context, AppRoutes.joinQueue);
    if (!mounted) return;
    if (result is QueueJoinResult) {
      context.read<AppState>().addQueueFromJoinResult(result);
      // Also re-fetch from server to get the authoritative entry with real _id
      await context.read<AppState>().fetchQueueStatus();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Joined queue: ${result.queueNumber}')));
    }
  }

  Future<void> _goToBookAppointment() async {
    final result = await Navigator.pushNamed(context, AppRoutes.bookAppointment);
    if (!mounted) return;
    if (result is Appointment) {
      // Immediately add to local list + trigger server re-fetch
      final s = context.read<AppState>();
      s.addAppointment(result);
      // Also await a fresh fetch so the Appointments tab is populated right away
      await s.fetchAppointments();
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Appointment booked!')));
    }
  }

  void _goToMap() => Navigator.pushNamed(context, AppRoutes.clinicMap);

  // ── AI Suggest ────────────────────────────────────────────────────────────
  void _showAiSuggestion() {
    final clinics = context.read<AppState>().clinics;
    if (clinics.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Loading clinics… please try again.')));
      return;
    }

    // Score: lower is better. (queue × baseWait) × 0.5 + distanceKm × 5
    final scored = clinics.map((c) {
      final score =
          (c.queueLength * c.baseWaitTimePerPerson) * 0.5 + c.distanceKm * 5;
      return _ScoredClinic(clinic: c, score: score);
    }).toList()
      ..sort((a, b) => a.score.compareTo(b.score));

    final best   = scored.first.clinic;
    final reason = _buildReason(scored.first);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AiSuggestionSheet(
        best: best,
        allScored: scored,
        reason: reason,
        onSelect: (c) {
          Navigator.pop(context);
          Navigator.pushNamed(context, AppRoutes.clinicDetail, arguments: {
            '_id': c.id,
            'name': c.name,
            'address': c.address,
            'services': c.services,
            'currentWaitingTime': c.currentWaitingTime,
            'queueLength': c.queueLength,
            'contactNumber': c.contactNumber,
            'status': c.status,
          });
        },
        onViewMap: () {
          Navigator.pop(context);
          _goToMap();
        },
      ),
    );
  }

  String _buildReason(_ScoredClinic sc) {
    final c = sc.clinic;
    final parts = <String>[];
    if (c.queueLength <= 3)        parts.add('only ${c.queueLength} people in queue');
    if (c.currentWaitingTime < 30) parts.add('~${c.currentWaitingTime} min wait');
    if (c.distanceKm < 2.0)        parts.add('${c.distanceKm} km from you');
    return parts.isEmpty
        ? 'Best overall balance of distance, queue size, and wait time.'
        : 'Because it has ${parts.join(', ')}.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: IndexedStack(
        index: _navIndex,
        children: [
          _HomeTab(
            onJoinQueue:       _goToJoinQueue,
            onBookAppointment: _goToBookAppointment,
            onFindMap:         _goToMap,
            onAiSuggest:       _showAiSuggestion,
          ),
          const _QueueTab(),
          const _AppointmentsTab(),
          const _ProfileTab(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _navIndex,
        onTap: _onTabChange,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined),               activeIcon: Icon(Icons.home),                label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.confirmation_number_outlined), activeIcon: Icon(Icons.confirmation_number), label: 'Queue'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month_outlined),      activeIcon: Icon(Icons.calendar_month),      label: 'Appointments'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline),               activeIcon: Icon(Icons.person),              label: 'Profile'),
        ],
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// HOME TAB
// ═════════════════════════════════════════════════════════════════════════════
class _HomeTab extends StatelessWidget {
  final VoidCallback onJoinQueue;
  final VoidCallback onBookAppointment;
  final VoidCallback onFindMap;
  final VoidCallback onAiSuggest;

  const _HomeTab({
    required this.onJoinQueue,
    required this.onBookAppointment,
    required this.onFindMap,
    required this.onAiSuggest,
  });

  @override
  Widget build(BuildContext context) {
    final appState  = context.watch<AppState>();
    final user      = appState.currentUser;
    final clinics   = appState.clinics;
    final selected  = appState.selectedClinic;
    final queues    = appState.activeQueues;
    final appts     = appState.upcomingAppointments;
    final nextAppt  = appts.isNotEmpty ? appts.first : null;
    final firstName = user?.fullName.split(' ').first ?? 'Patient';

    return SafeArea(
      child: Column(children: [
        // ── Gradient header ──────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.bgTop, AppColors.bgBottom],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.only(
              bottomLeft:  Radius.circular(20),
              bottomRight: Radius.circular(20),
            ),
          ),
          child: Row(children: [
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Hi, $firstName 👋',
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                const Text('How can we help you today?',
                    style: TextStyle(color: Colors.white70, fontSize: 13)),
              ],
            )),
            IconButton(
              icon: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 26),
              onPressed: () => Navigator.pushNamed(context, AppRoutes.notifications),
            ),
          ]),
        ),

        // ── Scrollable body ──────────────────────────────────────────────
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              final s = context.read<AppState>();
              await Future.wait([s.fetchClinics(), s.fetchAppointments(), s.fetchQueueStatus()]);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
              children: [

                // ── Clinic selector ──────────────────────────────────────
                const Text('Select Clinic',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                const SizedBox(height: 8),
                SizedBox(
                  height: 110,
                  child: clinics.isEmpty
                      ? const Center(child: CircularProgressIndicator())
                      : ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: clinics.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 10),
                          itemBuilder: (_, i) => _ClinicCard(
                            clinic: clinics[i],
                            isSelected: selected?.id == clinics[i].id,
                            onTap: () => context.read<AppState>().selectClinic(clinics[i]),
                          ),
                        ),
                ),

                const SizedBox(height: 18),

                // ── 2×2 Quick Action Grid ────────────────────────────────
                const Text('Quick Actions',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: _ActionTile(
                    icon: Icons.calendar_month_outlined,
                    label: 'Book Appointment',
                    color: AppColors.primary,
                    filled: true,
                    onTap: onBookAppointment,
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _ActionTile(
                    icon: Icons.confirmation_number_outlined,
                    label: 'Get Queue Number',
                    color: AppColors.primary,
                    filled: false,
                    onTap: onJoinQueue,
                  )),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: _ActionTile(
                    icon: Icons.map_outlined,
                    label: 'Find on Map',
                    color: const Color(0xFF059669),
                    filled: false,
                    onTap: onFindMap,
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _ActionTile(
                    icon: Icons.auto_awesome_outlined,
                    label: 'AI Suggest',
                    color: const Color(0xFF7C3AED),
                    filled: false,
                    onTap: onAiSuggest,
                  )),
                ]),

                const SizedBox(height: 18),

                // ── Services of selected clinic ──────────────────────────
                if (selected != null) ...[
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Services Available',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                    Text('~${selected.currentWaitingTime} min wait',
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 13)),
                  ]),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8, runSpacing: 8,
                    children: selected.services.map((s) => _ServiceChip(name: s)).toList(),
                  ),
                  const SizedBox(height: 18),
                ],

                // ── Current Status ───────────────────────────────────────
                const Text('Current Status',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                const SizedBox(height: 10),

                if (queues.isEmpty && nextAppt == null)
                  const _StatusEmptyCard()
                else ...[
                  if (queues.isNotEmpty)
                    ...queues.map((q) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _QueueCard(entry: q),
                        )),
                  if (nextAppt != null) _NextAppointmentCard(appt: nextAppt),
                  if (appts.length > 1) ...[
                    const SizedBox(height: 10),
                    _MoreApptsRow(count: appts.length - 1),
                  ],
                ],

                const SizedBox(height: 18),

                // ── AI Chatbot banner ────────────────────────────────────
                GestureDetector(
                  onTap: () => Navigator.pushNamed(context, AppRoutes.chatBot),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [AppColors.bgTop, AppColors.bgBottom]),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Row(children: [
                      Icon(Icons.smart_toy_outlined, color: Colors.white, size: 28),
                      SizedBox(width: 12),
                      Expanded(child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('AI Health Assistant',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                          Text('Ask about queue, appointments, services',
                              style: TextStyle(color: Colors.white70, fontSize: 12)),
                        ],
                      )),
                      Icon(Icons.arrow_forward_ios_rounded, color: Colors.white70, size: 16),
                    ]),
                  ),
                ),
              ],
            ),
          ),
        ),
      ]),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// QUEUE TAB
// ═════════════════════════════════════════════════════════════════════════════
class _QueueTab extends StatelessWidget {
  const _QueueTab();

  @override
  Widget build(BuildContext context) {
    final queues = context.watch<AppState>().queues;
    final active = queues.where((q) => q.status == QueueStatus.waiting || q.status == QueueStatus.inProgress).toList();
    final past   = queues.where((q) => q.status == QueueStatus.completed || q.status == QueueStatus.missed).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        automaticallyImplyLeading: false,
        title: const Text('My Queue', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.textDark)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.textDark),
            onPressed: () => context.read<AppState>().fetchQueueStatus(),
          ),
        ],
      ),
      body: queues.isEmpty
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.confirmation_number_outlined, size: 64, color: AppColors.textMuted),
              const SizedBox(height: 16),
              const Text('No Active Queue', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              const SizedBox(height: 8),
              const Text('You have not joined any queue yet.', style: TextStyle(color: AppColors.textMuted)),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pushNamed(context, AppRoutes.joinQueue),
                style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Get Queue Number'),
              ),
            ]))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (active.isNotEmpty) ...[
                  const Text('Active', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textDark)),
                  const SizedBox(height: 10),
                  ...active.map((q) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _QueueDetailCard(entry: q,
                          onLeave: () => context.read<AppState>().leaveQueue(q.queueNumber)))),
                ],
                if (past.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  const Text('History', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textDark)),
                  const SizedBox(height: 10),
                  ...past.map((q) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _QueueDetailCard(entry: q, onLeave: null))),
                ],
              ],
            ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS TAB
// ═════════════════════════════════════════════════════════════════════════════
class _AppointmentsTab extends StatelessWidget {
  const _AppointmentsTab();

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final upcoming = appState.upcomingAppointments;
    final past     = appState.pastAppointments;
    final fmt      = DateFormat('MMM d, yyyy');

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFFF6F7FB),
        appBar: AppBar(
          backgroundColor: Colors.white,
          automaticallyImplyLeading: false,
          title: const Text('Appointments', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.textDark)),
          actions: [
            IconButton(
              icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
              onPressed: () => Navigator.pushNamed(context, AppRoutes.bookAppointment),
            ),
          ],
          bottom: TabBar(
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textMuted,
            indicatorColor: AppColors.primary,
            tabs: [
              Tab(text: 'Upcoming (${upcoming.length})'),
              Tab(text: 'Past (${past.length})'),
            ],
          ),
        ),
        body: TabBarView(children: [
          _ApptList(appointments: upcoming, fmt: fmt, canCancel: true),
          _ApptList(appointments: past,     fmt: fmt, canCancel: false),
        ]),
      ),
    );
  }
}

class _ApptList extends StatelessWidget {
  final List<Appointment> appointments;
  final DateFormat fmt;
  final bool canCancel;
  const _ApptList({required this.appointments, required this.fmt, required this.canCancel});

  @override
  Widget build(BuildContext context) {
    if (appointments.isEmpty) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.event_busy_outlined, size: 60, color: AppColors.textMuted),
        const SizedBox(height: 14),
        const Text('No appointments', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textDark)),
        if (canCancel) ...[
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, AppRoutes.bookAppointment),
            style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('Book an Appointment'),
          ),
        ],
      ]));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: appointments.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) {
        final a = appointments[i];
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 6, offset: const Offset(0, 2))],
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(a.clinicName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.textDark)),
              const SizedBox(height: 4),
              Text(a.serviceName, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
              const SizedBox(height: 4),
              Row(children: [
                const Icon(Icons.calendar_today_outlined, size: 13, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Text(fmt.format(a.date), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                const SizedBox(width: 10),
                const Icon(Icons.access_time_rounded, size: 13, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Text(a.timeLabel, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ]),
              if (canCancel && (a.status == AppointmentStatus.pending || a.status == AppointmentStatus.confirmed)) ...[
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () async {
                      final ok = await showDialog<bool>(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: const Text('Cancel Appointment'),
                          content: const Text('Are you sure?'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep It')),
                            TextButton(onPressed: () => Navigator.pop(context, true),  child: const Text('Cancel', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      );
                      if (ok == true && context.mounted) context.read<AppState>().cancelAppointment(a.id);
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Cancel Appointment'),
                  ),
                ),
              ],
            ]),
          ),
        );
      },
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ═════════════════════════════════════════════════════════════════════════════
class _ProfileTab extends StatefulWidget {
  const _ProfileTab();
  @override
  State<_ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<_ProfileTab> {
  bool _editing = false;
  late TextEditingController _nameCtrl, _phoneCtrl, _ageCtrl, _philCtrl, _hmoCtrl;

  @override
  void initState() {
    super.initState();
    final u = context.read<AppState>().currentUser;
    _nameCtrl  = TextEditingController(text: u?.fullName ?? '');
    _phoneCtrl = TextEditingController(text: u?.phone ?? '');
    _ageCtrl   = TextEditingController(text: u?.age ?? '');
    _philCtrl  = TextEditingController(text: u?.philHealthNumber ?? '');
    _hmoCtrl   = TextEditingController(text: u?.hmoNumber ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _phoneCtrl.dispose(); _ageCtrl.dispose();
    _philCtrl.dispose(); _hmoCtrl.dispose();
    super.dispose();
  }

  void _save() {
    context.read<AppState>().updateCurrentUserProfile(
      fullName: _nameCtrl.text.trim(), phone: _phoneCtrl.text.trim(),
      age: _ageCtrl.text.trim(), philHealthNumber: _philCtrl.text.trim(),
      hmoNumber: _hmoCtrl.text.trim(),
    );
    setState(() => _editing = false);
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated.')));
  }

  @override
  Widget build(BuildContext context) {
    final u = context.watch<AppState>().currentUser;
    if (u == null) return const Center(child: CircularProgressIndicator());

    final initials = u.fullName.trim().split(' ')
        .where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        automaticallyImplyLeading: false,
        title: const Text('My Profile', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.textDark)),
        actions: [
          if (!_editing)
            IconButton(icon: const Icon(Icons.edit_outlined, color: AppColors.primary),
                onPressed: () => setState(() => _editing = true))
          else
            TextButton(onPressed: _save,
                child: const Text('Save', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary))),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Avatar
          Container(
            width: 80, height: 80,
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [AppColors.bgTop, AppColors.bgBottom]),
              shape: BoxShape.circle,
            ),
            child: Center(child: Text(initials,
                style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900))),
          ),
          const SizedBox(height: 12),
          Text(u.fullName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textDark)),
          Text(u.email,    style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 24),

          // Fields
          Container(
            decoration: BoxDecoration(
              color: Colors.white, borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
            ),
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              _ProfileField(label: 'Full Name',  ctrl: _nameCtrl,  icon: Icons.person_outline,            editing: _editing),
              _ProfileField(label: 'Phone',      ctrl: _phoneCtrl, icon: Icons.phone_outlined,             editing: _editing),
              _ProfileField(label: 'Age',        ctrl: _ageCtrl,   icon: Icons.cake_outlined,              editing: _editing),
              _ProfileField(label: 'PhilHealth', ctrl: _philCtrl,  icon: Icons.health_and_safety_outlined, editing: _editing),
              _ProfileField(label: 'HMO No.',    ctrl: _hmoCtrl,   icon: Icons.card_membership_outlined,   editing: _editing, isLast: true),
            ]),
          ),

          const SizedBox(height: 24),

          // Stats
          Row(children: [
            _StatCard(icon: Icons.calendar_month_outlined,      color: AppColors.primary,
                label: 'Appointments', value: '${context.watch<AppState>().appointments.length}'),
            const SizedBox(width: 12),
            _StatCard(icon: Icons.confirmation_number_outlined, color: Colors.orange,
                label: 'Queue Tickets', value: '${context.watch<AppState>().queues.length}'),
          ]),

          const SizedBox(height: 24),

          // Logout
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.logout_rounded, color: Colors.red),
              label: const Text('Sign Out', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w800)),
              onPressed: () async {
                await context.read<AppState>().logout();
                if (!context.mounted) return;
                Navigator.pushReplacementNamed(context, AppRoutes.login);
              },
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.red),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// AI SUGGESTION CLASSES
// ═════════════════════════════════════════════════════════════════════════════
class _ScoredClinic {
  final Clinic clinic;
  final double score;
  const _ScoredClinic({required this.clinic, required this.score});
}

class _AiSuggestionSheet extends StatelessWidget {
  final Clinic best;
  final List<_ScoredClinic> allScored;
  final String reason;
  final void Function(Clinic) onSelect;
  final VoidCallback onViewMap;

  const _AiSuggestionSheet({
    required this.best, required this.allScored, required this.reason,
    required this.onSelect, required this.onViewMap,
  });

  Color _waitColor(int w) => w < 30 ? Colors.green : w < 60 ? Colors.orange : Colors.red;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.78,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, ctrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(children: [
          // Handle
          Container(margin: const EdgeInsets.only(top: 10), width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(99))),
          const SizedBox(height: 16),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(children: [
              Container(width: 40, height: 40,
                  decoration: BoxDecoration(color: Colors.purple.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.auto_awesome_rounded, color: Colors.purple, size: 22)),
              const SizedBox(width: 12),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('AI Clinic Recommendation',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.textDark)),
                Text('Based on distance, queue & wait time',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ])),
            ]),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),

          // Content
          Expanded(child: ListView(controller: ctrl, padding: const EdgeInsets.all(16), children: [

            // Best pick card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [Color(0xFF7C3AED), Color(0xFF4F46E5)],
                    begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: Colors.purple.withOpacity(0.3), blurRadius: 12, offset: const Offset(0,4))],
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Row(children: [
                  Icon(Icons.stars_rounded, color: Colors.amber, size: 18),
                  SizedBox(width: 6),
                  Text('Best Pick for You', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w700, fontSize: 12)),
                ]),
                const SizedBox(height: 10),
                Text(best.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15)),
                const SizedBox(height: 4),
                Text(best.address, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                const SizedBox(height: 12),
                Wrap(spacing: 8, children: [
                  _StatPill(icon: Icons.people_outline,      label: '${best.queueLength} queued'),
                  _StatPill(icon: Icons.access_time_rounded, label: '~${best.currentWaitingTime} min wait'),
                  _StatPill(icon: Icons.near_me_outlined,    label: '${best.distanceKm} km'),
                ]),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Icon(Icons.auto_awesome_outlined, color: Colors.amber, size: 15),
                    const SizedBox(width: 8),
                    Expanded(child: Text(reason,
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontStyle: FontStyle.italic))),
                  ]),
                ),
                const SizedBox(height: 14),
                Row(children: [
                  Expanded(child: ElevatedButton.icon(
                    icon: const Icon(Icons.confirmation_number_outlined, size: 15),
                    label: const Text('Go Here'),
                    onPressed: () => onSelect(best),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.purple.shade700,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  )),
                  const SizedBox(width: 10),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.map_outlined, size: 15),
                    label: const Text('View Map'),
                    onPressed: onViewMap,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white54),
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ]),
              ]),
            ),

            const SizedBox(height: 20),
            const Text('All Branches Ranked',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.textDark)),
            const SizedBox(height: 4),
            const Text('Sorted by best combination of distance, queue, and wait time.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
            const SizedBox(height: 12),

            // All branches list
            ...allScored.asMap().entries.map((e) {
              final idx  = e.key;
              final c    = e.value.clinic;
              final isTop = idx == 0;
              return GestureDetector(
                onTap: () => onSelect(c),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isTop ? Colors.purple.withOpacity(0.05) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: isTop ? Colors.purple.withOpacity(0.3) : AppColors.border,
                        width: isTop ? 2 : 1),
                  ),
                  child: Row(children: [
                    Container(
                      width: 34, height: 34,
                      decoration: BoxDecoration(
                        color: isTop ? Colors.purple.withOpacity(0.15) : Colors.grey.shade100,
                        shape: BoxShape.circle,
                      ),
                      child: Center(child: isTop
                          ? const Icon(Icons.stars_rounded, color: Colors.purple, size: 18)
                          : Text('${idx + 1}',
                              style: TextStyle(fontWeight: FontWeight.w900, color: Colors.grey.shade600))),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(c.name.replaceAll('Hi-Precision Diagnostics - ', ''),
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13,
                              color: isTop ? Colors.purple.shade800 : AppColors.textDark)),
                      const SizedBox(height: 3),
                      Wrap(spacing: 10, children: [
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.people_outline, size: 12, color: _waitColor(c.currentWaitingTime)),
                          const SizedBox(width: 3),
                          Text('${c.queueLength} queued',
                              style: TextStyle(fontSize: 11, color: _waitColor(c.currentWaitingTime))),
                        ]),
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.access_time_rounded, size: 12, color: _waitColor(c.currentWaitingTime)),
                          const SizedBox(width: 3),
                          Text('~${c.currentWaitingTime} min',
                              style: TextStyle(fontSize: 11, color: _waitColor(c.currentWaitingTime))),
                        ]),
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.near_me_outlined, size: 12, color: AppColors.textMuted),
                          const SizedBox(width: 3),
                          Text('${c.distanceKm} km',
                              style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                        ]),
                      ]),
                    ])),
                    const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
                  ]),
                ),
              );
            }),
          ])),
        ]),
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _StatPill({required this.icon, required this.label});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(99)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, color: Colors.white, size: 12),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
    ]),
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SHARED SMALL WIDGETS
// ═════════════════════════════════════════════════════════════════════════════
class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool filled;
  final VoidCallback onTap;
  const _ActionTile({required this.icon, required this.label, required this.color, required this.filled, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: filled ? color : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: filled ? color : color.withOpacity(0.4)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0,2))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: filled ? Colors.white : color, size: 26),
        const SizedBox(height: 8),
        Text(label, style: TextStyle(
            fontWeight: FontWeight.w800, fontSize: 13,
            color: filled ? Colors.white : AppColors.textDark)),
      ]),
    ),
  );
}

class _ClinicCard extends StatelessWidget {
  final Clinic clinic;
  final bool isSelected;
  final VoidCallback onTap;
  const _ClinicCard({required this.clinic, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
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
          Icon(Icons.local_hospital_rounded,
              color: isSelected ? Colors.white : AppColors.primary, size: 15),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: clinic.queueLength > 8
                  ? Colors.red.withOpacity(0.15) : Colors.green.withOpacity(0.15),
              borderRadius: BorderRadius.circular(99),
            ),
            child: Text('${clinic.currentWaitingTime}m',
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
        Text('${clinic.distanceKm} km · ${clinic.queueLength} queued',
            style: TextStyle(fontSize: 11, color: isSelected ? Colors.white70 : AppColors.textMuted)),
      ]),
    ),
  );
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
      border: Border.all(color: AppColors.primary.withOpacity(0.2)),
    ),
    child: Text(name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)),
  );
}

class _StatusEmptyCard extends StatelessWidget {
  const _StatusEmptyCard();
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border),
    ),
    child: const Column(children: [
      Icon(Icons.inbox_outlined, size: 40, color: AppColors.textMuted),
      SizedBox(height: 10),
      Text('No active queue or appointments',
          style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textDark)),
      SizedBox(height: 4),
      Text('Book an appointment or join a queue to get started.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
    ]),
  );
}

class _QueueCard extends StatelessWidget {
  final QueueEntry entry;
  const _QueueCard({required this.entry});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border),
    ),
    child: Row(children: [
      Container(
        width: 50, height: 50,
        decoration: BoxDecoration(
          color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
        child: Center(child: Text(entry.queueNumber,
            style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w900, fontSize: 11))),
      ),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(entry.clinicName,
            style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark, fontSize: 13),
            maxLines: 1, overflow: TextOverflow.ellipsis),
        Text(entry.serviceName, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
      ])),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text('~${entry.estimatedWaitTimeMinutes} min',
            style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
        Text('${entry.position} ahead',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
      ]),
    ]),
  );
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
      border: Border.all(color: AppColors.primary.withOpacity(0.2)),
    ),
    child: Row(children: [
      const Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 28),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(appt.clinicName,
            style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark),
            maxLines: 1, overflow: TextOverflow.ellipsis),
        Text(appt.serviceName, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
        Text('${appt.date.day}/${appt.date.month}/${appt.date.year} · ${appt.timeLabel}',
            style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 12)),
      ])),
    ]),
  );
}

class _MoreApptsRow extends StatelessWidget {
  final int count;
  const _MoreApptsRow({required this.count});
  @override
  Widget build(BuildContext context) => InkWell(
    borderRadius: BorderRadius.circular(12),
    onTap: () => Navigator.pushNamed(context, AppRoutes.appointments),
    child: Container(
      width: double.infinity, padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [
        const Icon(Icons.event_note_outlined, color: AppColors.primary),
        const SizedBox(width: 10),
        Expanded(child: Text(
            'You have $count more upcoming appointment${count == 1 ? "" : "s"}',
            style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark))),
        const Text('View all ›', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary)),
      ]),
    ),
  );
}

class _QueueDetailCard extends StatelessWidget {
  final QueueEntry entry;
  final Future<void> Function()? onLeave;
  const _QueueDetailCard({required this.entry, required this.onLeave});

  Color get _color {
    switch (entry.status) {
      case QueueStatus.waiting:    return Colors.orange;
      case QueueStatus.inProgress: return AppColors.primary;
      case QueueStatus.completed:  return Colors.green;
      case QueueStatus.missed:     return Colors.grey;
    }
  }
  String get _label {
    switch (entry.status) {
      case QueueStatus.waiting:    return 'Waiting';
      case QueueStatus.inProgress: return 'In Progress';
      case QueueStatus.completed:  return 'Completed';
      case QueueStatus.missed:     return 'Missed';
    }
  }

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(16),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0,2))],
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
              color: _color.withOpacity(0.12), borderRadius: BorderRadius.circular(99)),
          child: Text(_label,
              style: TextStyle(color: _color, fontWeight: FontWeight.w700, fontSize: 12)),
        ),
        const Spacer(),
        Text(entry.queueNumber,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.primary)),
      ]),
      const Divider(height: 20),
      Text(entry.clinicName,
          style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark),
          maxLines: 2, overflow: TextOverflow.ellipsis),
      const SizedBox(height: 4),
      Text(entry.serviceName, style: const TextStyle(color: AppColors.textMuted)),
      const SizedBox(height: 12),
      Row(children: [
        _Stat2(label: 'Position', value: '${entry.position}'),
        _Stat2(label: 'Ahead',    value: '${entry.totalAhead}'),
        _Stat2(label: 'Est. Wait', value: '~${entry.estimatedWaitTimeMinutes}m'),
      ]),
      if (onLeave != null) ...[
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: () => showDialog(
              context: context,
              builder: (_) => AlertDialog(
                title: const Text('Leave Queue'),
                content: const Text('Are you sure you want to leave?'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                  TextButton(
                      onPressed: () async { Navigator.pop(context); await onLeave!(); },
                      child: const Text('Leave', style: TextStyle(color: Colors.red))),
                ],
              ),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red, side: const BorderSide(color: Colors.red),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Leave Queue'),
          ),
        ),
      ],
    ]),
  );
}

class _Stat2 extends StatelessWidget {
  final String label, value;
  const _Stat2({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Expanded(child: Column(children: [
    Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.primary)),
    Text(label,  style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
  ]));
}

class _ProfileField extends StatelessWidget {
  final String label;
  final TextEditingController ctrl;
  final IconData icon;
  final bool editing;
  final bool isLast;
  const _ProfileField({required this.label, required this.ctrl, required this.icon,
      required this.editing, this.isLast = false});
  @override
  Widget build(BuildContext context) => Column(children: [
    Row(children: [
      Icon(icon, size: 18, color: AppColors.textMuted),
      const SizedBox(width: 10),
      SizedBox(width: 90, child: Text(label,
          style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600, fontSize: 13))),
      Expanded(child: editing
          ? TextField(controller: ctrl,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              decoration: const InputDecoration(isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 6)))
          : Text(ctrl.text.isEmpty ? '—' : ctrl.text,
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textDark))),
    ]),
    if (!isLast) const Divider(height: 20),
  ]);
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label, value;
  const _StatCard({required this.icon, required this.color, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Expanded(child: Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(14),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
    ),
    child: Row(children: [
      Container(width: 40, height: 40,
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: color, size: 20)),
      const SizedBox(width: 10),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
      ]),
    ]),
  ));
}
