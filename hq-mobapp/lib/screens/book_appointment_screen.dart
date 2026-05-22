import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/app_theme.dart';
import '../core/routes/app_routes.dart';
import '../models/clinic_model.dart';
import '../services/api_service.dart';

class BookAppointmentScreen extends StatefulWidget {
  const BookAppointmentScreen({super.key});
  @override
  State<BookAppointmentScreen> createState() => _BookAppointmentScreenState();
}

class _BookAppointmentScreenState extends State<BookAppointmentScreen> {
  ClinicService? _selectedService;
  DateTime? _selectedDate;
  Map<String, dynamic>? _selectedSlot;
  List<Map<String, dynamic>> _slots = [];
  bool _loadingSlots = false;
  bool _booking = false;
  final _reasonCtrl = TextEditingController();

  @override
  void dispose() { _reasonCtrl.dispose(); super.dispose(); }

  Future<void> _pickDate(Clinic clinic) async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now().add(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 60)),
    );
    if (date == null) return;
    setState(() { _selectedDate = date; _selectedSlot = null; _slots = []; });
    await _loadSlots(clinic);
  }

  Future<void> _loadSlots(Clinic clinic) async {
    if (_selectedDate == null || _selectedService == null) return;
    setState(() => _loadingSlots = true);
    try {
      final data = await ApiService.getAvailableSlots(
        clinicId: clinic.id,
        date: DateFormat('yyyy-MM-dd').format(_selectedDate!),
        serviceId: _selectedService!.id,
      );
      setState(() => _slots = data.map((s) => s as Map<String, dynamic>).toList());
    } catch (_) {
      setState(() => _slots = []);
    } finally {
      setState(() => _loadingSlots = false);
    }
  }

  Future<void> _book(Clinic clinic) async {
    if (_selectedService == null || _selectedDate == null || _selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a service, date, and time slot.'), backgroundColor: AppColors.error));
      return;
    }
    setState(() => _booking = true);
    try {
      await ApiService.bookAppointment(
        clinicId: clinic.id,
        serviceName: _selectedService!.name,
        serviceId: _selectedService!.id,
        appointmentDate: _selectedDate!.toIso8601String(),
        timeSlot: _selectedSlot!['label'],
        endTime: _selectedSlot!['endTime'],
        reason: _reasonCtrl.text.trim(),
      );
      if (mounted) {
        Navigator.pushReplacementNamed(context, AppRoutes.appointments);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Appointment booked successfully!'), backgroundColor: AppColors.success));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final clinic = ModalRoute.of(context)!.settings.arguments as Clinic;
    return Scaffold(
      appBar: AppBar(title: Text('Book at ${clinic.name}')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('1. Select Service', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            ...clinic.services.where((s) => s.isAvailable).map((s) => RadioListTile<ClinicService>(
              value: s, groupValue: _selectedService, title: Text(s.name),
              subtitle: Text('~${s.durationMinutes}min'),
              activeColor: AppColors.primary,
              onChanged: (v) async {
                setState(() { _selectedService = v; _selectedDate = null; _selectedSlot = null; _slots = []; });
              },
            )),
            const SizedBox(height: 16),

            const Text('2. Pick a Date', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              icon: const Icon(Icons.calendar_today),
              label: Text(_selectedDate == null
                ? 'Choose date'
                : DateFormat('EEE, MMMM d, yyyy').format(_selectedDate!)),
              onPressed: _selectedService == null ? null : () => _pickDate(clinic),
            ),
            const SizedBox(height: 16),

            if (_selectedDate != null) ...[
              const Text('3. Select Time Slot', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 10),
              if (_loadingSlots) const CircularProgressIndicator()
              else if (_slots.isEmpty) const Text('No available slots for this date.', style: TextStyle(color: AppColors.textMuted))
              else Wrap(
                spacing: 8, runSpacing: 8,
                children: _slots.map((slot) {
                  final isSelected = _selectedSlot?['_id'] == slot['_id'];
                  return GestureDetector(
                    onTap: () => setState(() => _selectedSlot = slot),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: isSelected ? AppColors.primary : const Color(0xFFDDE2E8)),
                      ),
                      child: Text(slot['label'] ?? '',
                        style: TextStyle(color: isSelected ? Colors.white : AppColors.textDark, fontWeight: FontWeight.w600)),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
            ],

            const Text('4. Reason for Visit', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            TextField(
              controller: _reasonCtrl,
              maxLines: 3,
              decoration: const InputDecoration(hintText: 'Describe your symptoms or reason (optional)'),
            ),
            const SizedBox(height: 28),

            ElevatedButton.icon(
              icon: _booking ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.check_circle_outline),
              label: const Text('Confirm Appointment'),
              onPressed: _booking ? null : () => _book(clinic),
            ),
          ],
        ),
      ),
    );
  }
}
