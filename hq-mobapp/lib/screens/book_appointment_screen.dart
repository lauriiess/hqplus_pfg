import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/routes/app_routes.dart';
import '../core/theme/app_theme.dart';
import '../services/api_service.dart';

class BookAppointmentScreen extends StatefulWidget {
  const BookAppointmentScreen({super.key});
  @override
  State<BookAppointmentScreen> createState() => _BookAppointmentScreenState();
}

class _BookAppointmentScreenState extends State<BookAppointmentScreen> {
  Map<String, dynamic>? _clinic;
  DateTime _selectedDate  = DateTime.now().add(const Duration(days: 1));
  String?  _selectedSlot;
  String?  _selectedService;
  String?  _reason;
  List<dynamic> _slots    = [];
  bool _loadingSlots = false;
  bool _booking      = false;
  String? _slotsError;

  final _reasonCtrl = TextEditingController();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_clinic == null) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map<String, dynamic>) {
        setState(() => _clinic = args);
        _loadSlots();
      }
    }
  }

  @override
  void dispose() { _reasonCtrl.dispose(); super.dispose(); }

  Future<void> _loadSlots() async {
    if (_clinic == null) return;
    setState(() { _loadingSlots = true; _slotsError = null; _selectedSlot = null; });
    try {
      final data = await ApiService.getAvailableSlots(
        clinicId: _clinic!['_id']?.toString() ?? '',
        date:     DateFormat('yyyy-MM-dd').format(_selectedDate),
      );
      if (mounted) setState(() { _slots = data; _loadingSlots = false; });
    } catch (e) {
      if (mounted) setState(() { _slotsError = e.toString(); _slots = []; _loadingSlots = false; });
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().add(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 60)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(colorScheme: const ColorScheme.light(primary: AppColors.primary)),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() { _selectedDate = picked; _selectedSlot = null; });
      _loadSlots();
    }
  }

  Future<void> _book() async {
    final clinic = _clinic;
    if (clinic == null) return;
    if (_selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a time slot'), backgroundColor: AppColors.warning));
      return;
    }
    setState(() => _booking = true);
    try {
      await ApiService.bookAppointment(
        clinicId:        clinic['_id']?.toString() ?? '',
        serviceName:     _selectedService ?? 'General Consultation',
        appointmentDate: DateFormat('yyyy-MM-dd').format(_selectedDate),
        timeSlot:        _selectedSlot!,
        reason:          _reasonCtrl.text.trim().isEmpty ? null : _reasonCtrl.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Appointment booked successfully!'), backgroundColor: AppColors.success));
        Navigator.pushNamedAndRemoveUntil(context, AppRoutes.appointments, (r) => r.settings.name == AppRoutes.home);
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
    final clinic   = _clinic;
    final services = clinic != null ? ((clinic['services'] as List<dynamic>?) ?? []) : [];
    final serviceNames = services
      .map((s) => s is Map ? s['name']?.toString() : s.toString())
      .where((s) => s != null && s!.isNotEmpty)
      .cast<String>()
      .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Book Appointment'),
        backgroundColor: AppColors.primary, foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

          // Clinic header
          if (clinic != null) Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(14)),
            child: Row(children: [
              const Icon(Icons.local_hospital_rounded, color: AppColors.primary, size: 28),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(clinic['name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textDark)),
                Text(clinic['city']?.toString() ?? '', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ])),
            ]),
          ),
          const SizedBox(height: 20),

          // Service
          if (serviceNames.isNotEmpty) ...[
            const Text('Select Service', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _selectedService,
              decoration: InputDecoration(
                hintText: 'Choose a service',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDDE2E8))),
                filled: true, fillColor: Colors.white,
              ),
              items: serviceNames.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 14)))).toList(),
              onChanged: (v) => setState(() => _selectedService = v),
            ),
            const SizedBox(height: 20),
          ],

          // Date picker
          const Text('Select Date', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: _pickDate,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFDDE2E8))),
              child: Row(children: [
                const Icon(Icons.calendar_today_outlined, color: AppColors.primary, size: 20),
                const SizedBox(width: 12),
                Text(DateFormat('EEEE, MMMM d, yyyy').format(_selectedDate),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textDark)),
                const Spacer(),
                const Icon(Icons.chevron_right, color: AppColors.textMuted),
              ]),
            ),
          ),
          const SizedBox(height: 20),

          // Time slots
          const Text('Available Time Slots', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
          const SizedBox(height: 8),
          if (_loadingSlots)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
          else if (_slotsError != null)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFCA5A5))),
              child: Column(children: [
                Text(_slotsError!, style: const TextStyle(fontSize: 12, color: Color(0xFF991B1B))),
                const SizedBox(height: 8),
                TextButton(onPressed: _loadSlots, child: const Text('Retry')),
              ]),
            )
          else if (_slots.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFEEEEEE))),
              child: Center(child: Column(children: [
                Icon(Icons.event_busy_outlined, size: 36, color: Colors.grey.shade300),
                const SizedBox(height: 8),
                const Text('No slots available on this date', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                const SizedBox(height: 4),
                const Text('Try another date', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
              ])),
            )
          else
            Wrap(spacing: 8, runSpacing: 8,
              children: _slots.map((slot) {
                final time    = slot is Map ? slot['startTime']?.toString() ?? slot.toString() : slot.toString();
                final isFull  = slot is Map && (slot['isFull'] == true || (slot['booked'] ?? 0) >= (slot['capacity'] ?? 999));
                final selected = _selectedSlot == time;
                return GestureDetector(
                  onTap: isFull ? null : () => setState(() => _selectedSlot = selected ? null : time),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: isFull ? Colors.grey.shade100 : (selected ? AppColors.primary : Colors.white),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isFull ? Colors.grey.shade300 : (selected ? AppColors.primary : const Color(0xFFDDE2E8)),
                        width: selected ? 2 : 1,
                      ),
                    ),
                    child: Text(time,
                      style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600,
                        color: isFull ? Colors.grey : (selected ? Colors.white : AppColors.textDark),
                      )),
                  ),
                );
              }).toList(),
            ),

          const SizedBox(height: 20),

          // Reason
          const Text('Reason / Notes (optional)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textDark)),
          const SizedBox(height: 8),
          TextField(
            controller: _reasonCtrl,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Describe your symptoms or reason for visit…',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDDE2E8))),
              filled: true, fillColor: Colors.white,
            ),
          ),
          const SizedBox(height: 28),

          // Confirm button
          ElevatedButton(
            onPressed: (_booking || _selectedSlot == null) ? null : _book,
            style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
            child: _booking
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Confirm Appointment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 20),
        ]),
      ),
    );
  }
}
