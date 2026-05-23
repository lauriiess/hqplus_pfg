import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../state/app_state.dart';
import '../models/clinic_models.dart';
import '../models/appointment_models.dart';
import '../services/api_service.dart';

class BookAppointmentScreen extends StatefulWidget {
  const BookAppointmentScreen({super.key});
  @override State<BookAppointmentScreen> createState() => _BookAppointmentScreenState();
}

class _BookAppointmentScreenState extends State<BookAppointmentScreen> {
  int step = 1;
  Clinic?  selectedClinic;
  String?  selectedService;
  DateTime? selectedDate;
  String?  selectedTime;
  final reasonCtrl = TextEditingController();
  bool loading = false;

  static const _times = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'];

  @override
  void initState() {
    super.initState();
    final pre = context.read<AppState>().selectedClinic;
    if (pre != null) { selectedClinic = pre; step = 2; }
  }

  @override void dispose() { reasonCtrl.dispose(); super.dispose(); }

  bool get canConfirm => selectedClinic != null && selectedService != null && selectedDate != null && selectedTime != null;

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now, lastDate: now.add(const Duration(days: 60)));
    if (picked != null) setState(() => selectedDate = picked);
  }

  Future<void> _confirm() async {
    if (!canConfirm) return;
    setState(() => loading = true);
    try {
      final dateStr = '${selectedDate!.year}-${selectedDate!.month.toString().padLeft(2,'0')}-${selectedDate!.day.toString().padLeft(2,'0')}';
      final data = await ApiService.bookAppointment(
        clinicId: selectedClinic!.id, serviceName: selectedService!,
        appointmentDate: dateStr, timeSlot: selectedTime!,
        notes: reasonCtrl.text.trim().isEmpty ? null : reasonCtrl.text.trim());
      final appt = Appointment.fromJson(data['appointment'] ?? data);
      if (!mounted) return;
      Navigator.pop(context, appt);
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
        title: const Text('Book Appointment', style: TextStyle(fontWeight: FontWeight.w900)),
        bottom: PreferredSize(preferredSize: const Size.fromHeight(36),
          child: Column(children: [
            const Divider(height: 1, color: AppColors.border),
            Padding(padding: const EdgeInsets.fromLTRB(16,6,16,8),
              child: Row(children: [
                Expanded(child: Text(
                  step == 1 ? 'Choose a clinic' : step == 2 ? 'Choose a service' : 'Pick date & time',
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
          : _StepDateTime(
              clinic: selectedClinic!, service: selectedService!,
              selectedDate: selectedDate, selectedTime: selectedTime,
              times: _times, reasonCtrl: reasonCtrl,
              onPickDate: _pickDate,
              onPickTime: (t) => setState(() => selectedTime = t),
              canConfirm: canConfirm, loading: loading, onConfirm: _confirm)),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: step < 3 ? Padding(
        padding: const EdgeInsets.fromLTRB(16,0,16,6),
        child: SizedBox(width: double.infinity, height: 48,
          child: ElevatedButton(
            onPressed: (step == 1 && selectedClinic == null) || (step == 2 && selectedService == null)
              ? null : () => setState(() => step++),
            style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('Continue', style: TextStyle(fontWeight: FontWeight.w800))))) : null,
    );
  }
}

class _StepPill extends StatelessWidget {
  final int step, total;
  const _StepPill({required this.step, required this.total});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(99)),
    child: Text('Step $step of $total', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 12)));
}

class _StepClinic extends StatelessWidget {
  final List<Clinic> clinics;
  final String? selectedId;
  final void Function(Clinic) onSelect;
  const _StepClinic({required this.clinics, required this.selectedId, required this.onSelect});
  @override Widget build(BuildContext context) => ListView.separated(
    padding: const EdgeInsets.all(16), itemCount: clinics.length,
    separatorBuilder: (_, __) => const SizedBox(height: 10),
    itemBuilder: (_, i) {
      final c = clinics[i]; final sel = c.id == selectedId;
      return GestureDetector(onTap: () => onSelect(c),
        child: AnimatedContainer(duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: sel ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: 2)),
          child: Row(children: [
            Icon(Icons.local_hospital_rounded, color: sel ? Colors.white : AppColors.primary),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(c.name, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13,
                color: sel ? Colors.white : AppColors.textDark), maxLines: 2, overflow: TextOverflow.ellipsis),
              Text('${c.services.length} services · ${c.distanceKm} km',
                style: TextStyle(fontSize: 11, color: sel ? Colors.white70 : AppColors.textMuted)),
            ])),
            if (sel) const Icon(Icons.check_circle, color: Colors.white),
          ])));
    });
}

class _StepService extends StatelessWidget {
  final Clinic clinic;
  final String? selectedService;
  final void Function(String) onSelect;
  const _StepService({required this.clinic, required this.selectedService, required this.onSelect});
  @override Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      Container(padding: const EdgeInsets.all(12), margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.06), borderRadius: BorderRadius.circular(12)),
        child: Text(clinic.name, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary))),
      ...clinic.services.map((s) {
        final sel = s == selectedService;
        return GestureDetector(onTap: () => onSelect(s),
          child: AnimatedContainer(duration: const Duration(milliseconds: 150),
            margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: sel ? AppColors.primary : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: 2)),
            child: Row(children: [
              Icon(Icons.medical_services_outlined, color: sel ? Colors.white : AppColors.primary),
              const SizedBox(width: 12),
              Text(s, style: TextStyle(fontWeight: FontWeight.w700, color: sel ? Colors.white : AppColors.textDark)),
              const Spacer(),
              if (sel) const Icon(Icons.check_circle, color: Colors.white, size: 20),
            ])));
      }),
    ]);
}

class _StepDateTime extends StatelessWidget {
  final Clinic clinic;
  final String service;
  final DateTime? selectedDate;
  final String? selectedTime;
  final List<String> times;
  final TextEditingController reasonCtrl;
  final VoidCallback onPickDate;
  final void Function(String) onPickTime;
  final bool canConfirm, loading;
  final VoidCallback onConfirm;

  const _StepDateTime({required this.clinic, required this.service,
    required this.selectedDate, required this.selectedTime, required this.times,
    required this.reasonCtrl, required this.onPickDate, required this.onPickTime,
    required this.canConfirm, required this.loading, required this.onConfirm});

  @override Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _row('Clinic',  clinic.name),
      _row('Service', service),
      const SizedBox(height: 16),
      const Text('Select Date', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark)),
      const SizedBox(height: 8),
      GestureDetector(onTap: onPickDate,
        child: Container(padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.fieldFill, borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border)),
          child: Row(children: [
            const Icon(Icons.calendar_month_outlined, color: AppColors.primary),
            const SizedBox(width: 10),
            Text(selectedDate == null ? 'Pick a date'
              : '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year}',
              style: TextStyle(fontWeight: FontWeight.w700,
                color: selectedDate == null ? AppColors.textMuted : AppColors.textDark)),
          ]))),
      const SizedBox(height: 16),
      const Text('Select Time', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8,
        children: times.map((t) {
          final sel = t == selectedTime;
          return GestureDetector(onTap: () => onPickTime(t),
            child: AnimatedContainer(duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: sel ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: 2)),
              child: Text(t, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13,
                color: sel ? Colors.white : AppColors.textDark))));
        }).toList()),
      const SizedBox(height: 16),
      const Text('Reason / Notes (optional)', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark)),
      const SizedBox(height: 8),
      TextField(controller: reasonCtrl, maxLines: 3,
        decoration: const InputDecoration(hintText: 'Describe your concern or reason for the visit...')),
      const SizedBox(height: 24),
      SizedBox(width: double.infinity, height: 50,
        child: loading
          ? const Center(child: CircularProgressIndicator())
          : ElevatedButton(
              onPressed: canConfirm ? onConfirm : null,
              style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Confirm Appointment', style: TextStyle(fontWeight: FontWeight.w800)))),
    ]));

  Widget _row(String l, String v) => Padding(padding: const EdgeInsets.only(bottom: 10),
    child: Row(children: [
      SizedBox(width: 70, child: Text(l, style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600))),
      Expanded(child: Text(v, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark),
        maxLines: 2, overflow: TextOverflow.ellipsis)),
    ]));
}
