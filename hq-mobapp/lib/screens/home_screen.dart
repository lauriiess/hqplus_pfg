import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../core/routes/app_routes.dart';
import '../core/theme/app_theme.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _queueStatus;
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.getMyQueueStatus();
      if (mounted) setState(() { _queueStatus = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().currentUser;
    final active = _queueStatus?['active'] == true;
    final entry  = _queueStatus?['entry'] as Map<String, dynamic>?;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        onRefresh: _load,
        child: CustomScrollView(
          slivers: [
            // App bar with gradient
            SliverAppBar(
              expandedHeight: 160,
              floating: false, pinned: true,
              backgroundColor: AppColors.primary,
              actions: [
                IconButton(
                  icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                  onPressed: () => Navigator.pushNamed(context, AppRoutes.notifications),
                ),
                IconButton(
                  icon: const Icon(Icons.person_outline, color: Colors.white),
                  onPressed: () => Navigator.pushNamed(context, AppRoutes.profile),
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                      colors: [AppColors.bgTop, AppColors.bgBottom],
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(20, 80, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text('Hello, ${user?.fullName.split(' ').first ?? 'Patient'}!',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
                      const SizedBox(height: 4),
                      Text('How can we help you today?',
                        style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.85))),
                    ],
                  ),
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.all(20),
              sliver: SliverList(delegate: SliverChildListDelegate([

                // ── Active Queue Banner ──────────────────────────────────
                if (_loading)
                  const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
                else if (_error != null)
                  _ErrorCard(message: _error!, onRetry: _load)
                else if (active && entry != null)
                  _QueueBanner(entry: entry, queueStatus: _queueStatus!, onRefresh: _load)
                else
                  _EmptyQueueCard(),

                const SizedBox(height: 24),

                // ── Quick Actions ────────────────────────────────────────
                const Text('Quick Actions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                const SizedBox(height: 14),
                GridView.count(
                  crossAxisCount: 2, shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12, mainAxisSpacing: 12,
                  childAspectRatio: 1.5,
                  children: [
                    _QuickAction(icon: Icons.queue_outlined,        label: 'Find a Clinic',     color: const Color(0xFF2563EB), route: AppRoutes.clinicDirectory),
                    _QuickAction(icon: Icons.calendar_month_outlined,label: 'Appointments',     color: const Color(0xFF16A34A), route: AppRoutes.appointments),
                    _QuickAction(icon: Icons.monitor_heart_outlined, label: 'Queue Status',     color: const Color(0xFFD97706), route: AppRoutes.queueStatus),
                    _QuickAction(icon: Icons.chat_bubble_outline,    label: 'Ask Assistant',    color: const Color(0xFF7C3AED), route: AppRoutes.chatbot),
                  ],
                ),

                const SizedBox(height: 24),
                const Text('Information', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textDark)),
                const SizedBox(height: 14),
                _InfoCard(
                  icon: Icons.info_outline,
                  title: 'How Queue Works',
                  desc: 'Find a clinic → Select service → Join queue → Wait for your number to be called.',
                  color: const Color(0xFFEFF6FF),
                  iconColor: const Color(0xFF2563EB),
                ),
                const SizedBox(height: 10),
                _InfoCard(
                  icon: Icons.access_time_outlined,
                  title: 'Operating Hours',
                  desc: 'Most clinics are open Monday–Saturday, 8:00 AM – 5:00 PM.',
                  color: const Color(0xFFF0FDF4),
                  iconColor: const Color(0xFF16A34A),
                ),
              ])),
            ),
          ],
        ),
      ),
    );
  }
}

class _QueueBanner extends StatelessWidget {
  final Map<String, dynamic> entry, queueStatus;
  final VoidCallback onRefresh;
  const _QueueBanner({required this.entry, required this.queueStatus, required this.onRefresh});
  @override
  Widget build(BuildContext context) {
    final ahead = queueStatus['ahead'] ?? 0;
    final wait  = queueStatus['estimatedWait'] ?? 0;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF1D4ED8), Color(0xFF2563EB)]),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 16, offset: const Offset(0,6))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.queue, color: Colors.white70, size: 16),
          const SizedBox(width: 6),
          Text('Active Queue — ${entry['serviceName'] ?? ''}',
            style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
          const Spacer(),
          IconButton(icon: const Icon(Icons.refresh, color: Colors.white70, size: 18), onPressed: onRefresh, padding: EdgeInsets.zero, constraints: const BoxConstraints()),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Text(entry['queueNumber'] ?? 'Q---',
            style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w900, color: Colors.white, height: 1)),
          const SizedBox(width: 20),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$ahead ahead of you', style: const TextStyle(color: Colors.white, fontSize: 14)),
            Text('~$wait min wait',    style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
          ]),
        ]),
        const SizedBox(height: 14),
        SizedBox(width: double.infinity,
          child: OutlinedButton(
            onPressed: () => Navigator.pushNamed(context, AppRoutes.queueStatus),
            style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white54), minimumSize: const Size.fromHeight(38)),
            child: const Text('View Full Status'),
          ),
        ),
      ]),
    );
  }
}

class _EmptyQueueCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16),
      border: Border.all(color: Colors.grey.shade200)),
    child: Column(children: [
      Icon(Icons.queue_outlined, size: 40, color: Colors.grey.shade300),
      const SizedBox(height: 10),
      const Text('No active queue', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textDark)),
      const SizedBox(height: 4),
      Text('Find a clinic and join a queue to get started.', style: TextStyle(fontSize: 12, color: AppColors.textMuted), textAlign: TextAlign.center),
      const SizedBox(height: 14),
      ElevatedButton.icon(
        onPressed: () => Navigator.pushNamed(context, AppRoutes.clinicDirectory),
        icon: const Icon(Icons.search, size: 16),
        label: const Text('Find a Clinic'),
        style: ElevatedButton.styleFrom(minimumSize: const Size(0, 40)),
      ),
    ]),
  );
}

class _ErrorCard extends StatelessWidget {
  final String message; final VoidCallback onRetry;
  const _ErrorCard({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFCA5A5))),
    child: Row(children: [
      const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 20),
      const SizedBox(width: 10),
      Expanded(child: Text(message, style: const TextStyle(fontSize: 13, color: Color(0xFF991B1B)))),
      TextButton(onPressed: onRetry, child: const Text('Retry')),
    ]),
  );
}

class _QuickAction extends StatelessWidget {
  final IconData icon; final String label; final Color color; final String route;
  const _QuickAction({required this.icon, required this.label, required this.color, required this.route});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () => Navigator.pushNamed(context, route),
    child: Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0,2))]),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Icon(icon, color: color, size: 26),
        Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
      ]),
    ),
  );
}

class _InfoCard extends StatelessWidget {
  final IconData icon; final String title, desc; final Color color, iconColor;
  const _InfoCard({required this.icon, required this.title, required this.desc, required this.color, required this.iconColor});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, color: iconColor, size: 22),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: iconColor)),
        const SizedBox(height: 3),
        Text(desc, style: TextStyle(fontSize: 12, color: iconColor.withOpacity(0.8), height: 1.4)),
      ])),
    ]),
  );
}
