import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../state/app_state.dart';
import '../models/clinic_models.dart';
import '../models/queue_models.dart';
import '../services/api_service.dart';

class JoinQueueScreen extends StatefulWidget {
  const JoinQueueScreen({super.key});
  @override State<JoinQueueScreen> createState() => _JoinQueueScreenState();
}

class _JoinQueueScreenState extends State<JoinQueueScreen> {
  int step = 1;
  Clinic?  selectedClinic;
  String?  selectedService;
  PatientType patientType = PatientType.regular;
  bool loading = false;

  @override
  void initState() {
    super.initState();
    final pre = context.read<AppState>().selectedClinic;
    if (pre != null) { selectedClinic = pre; step = 2; }
  }

  int get estimatedWait {
    if (selectedClinic == null) return 15;
    final base = selectedClinic!.baseWaitTimePerPerson;
    final q    = selectedClinic!.queueLength;
    return (patientType == PatientType.priority) ? base * 2 : base * (q + 1);
  }

  Future<void> _confirmAndJoin() async {
    if (selectedClinic == null || selectedService == null) return;
    setState(() => loading = true);
    try {
      final data = await ApiService.joinQueue(
        clinicId:    selectedClinic!.id,
        serviceName: selectedService!,
        priority:    patientType == PatientType.priority,
      );
      // data['entry'] has the full QueueEntry with _id from server
      final entry = data['entry'] as Map<String, dynamic>? ?? data;
      final result = QueueJoinResult(
        entryId:     entry['_id']?.toString() ?? '',
        clinicId:    selectedClinic!.id,
        clinicName:  selectedClinic!.name,
        serviceId:   selectedService!,
        serviceName: selectedService!,
        queueType:   patientType == PatientType.priority ? QueueType.priority : QueueType.regular,
        queueNumber: data['ticketNumber'] ?? entry['queueNumber'] ?? 'Q-${DateTime.now().millisecondsSinceEpoch % 1000}',
        position:    (data['peopleAhead'] ?? entry['positionAtJoin'] ?? 1) as int,
        totalAhead:  (data['peopleAhead'] ?? 0) as int,
        estimatedWaitTimeMinutes: (data['estimatedWaitTime'] ?? estimatedWait) as int,
        joinedAt: DateTime.now(),
      );
      if (!mounted) return;
      Navigator.pop(context, result);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final clinics = context.watch<AppState>().clinics;
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, foregroundColor: AppColors.textDark,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: step == 1 ? () => Navigator.pop(context) : () => setState(() => step--)),
        title: const Text('Get Queue Number', style: TextStyle(fontWeight: FontWeight.w900)),
        bottom: PreferredSize(preferredSize: const Size.fromHeight(36),
          child: Column(children: [
            const Divider(height: 1, color: AppColors.border),
            Padding(padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
              child: Row(children: [
                Expanded(child: Text(
                  step == 1 ? 'Choose a clinic' : step == 2 ? 'Choose a service' : 'Confirm details',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5, fontWeight: FontWeight.w600))),
                _StepPill(step: step, total: 3),
              ])),
          ])),
      ),
      body: SafeArea(child: step == 1
        ? _StepClinic(clinics: clinics, selectedId: selectedClinic?.id,
            onSelect: (c) => setState(() { selectedClinic = c; selectedService = null; }))
        : step == 2
          ? _StepService(clinic: selectedClinic!, selectedService: selectedService,
              onSelect: (s) => setState(() => selectedService = s))
          : _StepDetails(
              clinic: selectedClinic!, service: selectedService!,
              patientType: patientType,
              onTypeChanged: (t) => setState(() => patientType = t),
              estimatedWait: estimatedWait,
              loading: loading,
              onConfirm: _confirmAndJoin,
            )),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: step < 3 ? Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
        child: SizedBox(width: double.infinity, height: 48,
          child: ElevatedButton(
            onPressed: (step == 1 && selectedClinic == null) || (step == 2 && selectedService == null)
              ? null
              : () => setState(() => step++),
            style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('Continue', style: TextStyle(fontWeight: FontWeight.w800))))) : null,
    );
  }
}

class _StepPill extends StatelessWidget {
  final int step, total;
  const _StepPill({required this.step, required this.total});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(99)),
    child: Text('Step $step of $total',
      style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 12)));
}

class _StepClinic extends StatelessWidget {
  final List<Clinic> clinics;
  final String? selectedId;
  final void Function(Clinic) onSelect;
  const _StepClinic({required this.clinics, required this.selectedId, required this.onSelect});
  @override
  Widget build(BuildContext context) => ListView.separated(
    padding: const EdgeInsets.all(16),
    itemCount: clinics.length,
    separatorBuilder: (_, __) => const SizedBox(height: 10),
    itemBuilder: (_, i) {
      final c = clinics[i];
      final sel = c.id == selectedId;
      return GestureDetector(
        onTap: () => onSelect(c),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: sel ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: 2),
            boxShadow: sel ? [BoxShadow(color: AppColors.primary.withOpacity(0.2), blurRadius: 8)] : []),
          child: Row(children: [
            Icon(Icons.local_hospital_rounded, color: sel ? Colors.white : AppColors.primary),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(c.name, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13,
                color: sel ? Colors.white : AppColors.textDark), maxLines: 2, overflow: TextOverflow.ellipsis),
              Text(c.address, style: TextStyle(fontSize: 11, color: sel ? Colors.white70 : AppColors.textMuted),
                maxLines: 1, overflow: TextOverflow.ellipsis),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: c.queueLength > 8 ? Colors.red.withOpacity(0.15) : Colors.green.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(99)),
                child: Text('${c.currentWaitingTime}m',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                    color: c.queueLength > 8 ? Colors.red : Colors.green))),
              const SizedBox(height: 4),
              Text('${c.queueLength} in queue',
                style: TextStyle(fontSize: 10, color: sel ? Colors.white60 : AppColors.textMuted)),
            ]),
          ])),
      );
    });
}

class _StepService extends StatelessWidget {
  final Clinic clinic;
  final String? selectedService;
  final void Function(String) onSelect;
  const _StepService({required this.clinic, required this.selectedService, required this.onSelect});
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      Container(padding: const EdgeInsets.all(12), margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.06), borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.primary.withOpacity(0.2))),
        child: Text(clinic.name, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary))),
      ...clinic.services.map((s) {
        final sel = s == selectedService;
        return GestureDetector(
          onTap: () => onSelect(s),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: sel ? AppColors.primary : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: 2)),
            child: Row(children: [
              Icon(Icons.medical_services_outlined, color: sel ? Colors.white : AppColors.primary),
              const SizedBox(width: 12),
              Text(s, style: TextStyle(fontWeight: FontWeight.w700,
                color: sel ? Colors.white : AppColors.textDark)),
              const Spacer(),
              if (sel) const Icon(Icons.check_circle, color: Colors.white, size: 20),
            ])));
      }),
    ]);
}

class _StepDetails extends StatelessWidget {
  final Clinic clinic;
  final String service;
  final PatientType patientType;
  final void Function(PatientType) onTypeChanged;
  final int estimatedWait;
  final bool loading;
  final VoidCallback onConfirm;
  const _StepDetails({required this.clinic, required this.service, required this.patientType,
    required this.onTypeChanged, required this.estimatedWait, required this.loading, required this.onConfirm});

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _InfoRow(label: 'Clinic',   value: clinic.name),
      _InfoRow(label: 'Service',  value: service),
      _InfoRow(label: 'Est. Wait', value: '$estimatedWait minutes'),
      const SizedBox(height: 16),
      const Text('Queue Type', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark)),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: _TypeBtn(label: 'Regular', icon: Icons.people_outline,
          selected: patientType == PatientType.regular,
          onTap: () => onTypeChanged(PatientType.regular))),
        const SizedBox(width: 10),
        Expanded(child: _TypeBtn(label: 'Priority', icon: Icons.star_outline,
          selected: patientType == PatientType.priority,
          onTap: () => onTypeChanged(PatientType.priority))),
      ]),
      const SizedBox(height: 24),
      Container(padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: const Color(0xFFFFF9EC), borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.amber.shade200)),
        child: const Row(children: [
          Icon(Icons.info_outline, color: Colors.amber, size: 20),
          SizedBox(width: 10),
          Expanded(child: Text('Priority queues are for senior citizens, PWD, and pregnant women.',
            style: TextStyle(fontSize: 12, color: Color(0xFF92400E)))),
        ])),
      const SizedBox(height: 24),
      SizedBox(width: double.infinity, height: 50,
        child: loading
          ? const Center(child: CircularProgressIndicator())
          : ElevatedButton(onPressed: onConfirm,
              style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Confirm & Join Queue', style: TextStyle(fontWeight: FontWeight.w800)))),
    ]));
}

class _InfoRow extends StatelessWidget {
  final String label, value;
  const _InfoRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Row(children: [
      SizedBox(width: 80, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600))),
      Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark),
        maxLines: 2, overflow: TextOverflow.ellipsis)),
    ]));
}

class _TypeBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _TypeBtn({required this.label, required this.icon, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: selected ? AppColors.primary : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: selected ? AppColors.primary : AppColors.border, width: 2)),
      child: Column(children: [
        Icon(icon, color: selected ? Colors.white : AppColors.primary),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13,
          color: selected ? Colors.white : AppColors.textDark)),
      ])));
}
