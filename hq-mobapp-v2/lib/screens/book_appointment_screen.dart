import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
// shared master data
import '../data/hospital_data.dart' as hospital;
// models
import '../models/queue_models.dart' as qm;
import '../models/appointment_models.dart' as apt;

class BookAppointmentScreen extends StatefulWidget {
  const BookAppointmentScreen({super.key});

  @override
  State<BookAppointmentScreen> createState() => _BookAppointmentScreenState();
}

class _BookAppointmentScreenState extends State<BookAppointmentScreen> {
  int step = 1;

  qm.Department? selectedDepartment;
  // for Lab/Radio only
  qm.ServiceItem? selectedService;
  // for all (but required for non-lab/radio)
  qm.Doctor? selectedDoctor;

  DateTime? selectedDate;
  String? selectedTime;
  final Set<String> fullyBooked = {"10:00 AM", "3:00 PM"};

  PatientType _patientType = PatientType.regular;

  final TextEditingController reasonCtrl = TextEditingController();

  apt.DoctorSelectionMode doctorMode = apt.DoctorSelectionMode.automatic;
  qm.Doctor? chosenDoctor; // only used when lab/radio and choose-doctor mode

  bool get _isLabOrRadio {
    final id = selectedDepartment?.id;
    return id == 'lab' || id == 'radio';
  }

  List<String> getTimeSlots() => const [
        "8:00 AM",
        "9:00 AM",
        "10:00 AM",
        "11:00 AM",
        "1:00 PM",
        "2:00 PM",
        "3:00 PM",
        "4:00 PM",
      ];

  List<qm.Doctor> get departmentDoctors {
    final dept = selectedDepartment;
    if (dept == null) return const [];
    return hospital.doctors.where((d) => d.departmentId == dept.id).toList();
  }

  qm.Doctor? get automaticDoctorOrNull {
    final list = departmentDoctors;
    if (list.isEmpty) return null;
    return list.first;
  }

  bool get canConfirm {
    final hasStep2Selection =
        _isLabOrRadio ? (selectedService != null) : (selectedDoctor != null);

    return selectedDepartment != null &&
        hasStep2Selection &&
        selectedDate != null &&
        selectedTime != null &&
        selectedTime!.isNotEmpty;
  }

  @override
  void dispose() {
    reasonCtrl.dispose();
    super.dispose();
  }

  void _goBack() {
    if (step == 1) {
      Navigator.pop(context);
      return;
    }
    setState(() => step -= 1);
  }

  void _continue() {
    if (step == 1) {
      if (selectedDepartment == null) return;
      setState(() => step = 2);
      return;
    }

    if (step == 2) {
      if (_isLabOrRadio) {
        if (selectedService == null) return;

        final docs = departmentDoctors;
        setState(() {
          selectedDoctor = docs.isNotEmpty ? docs.first : null;
          doctorMode = apt.DoctorSelectionMode.automatic;
          chosenDoctor = null;
          step = 3;
        });
        return;
      } else {
        if (selectedDoctor == null) return;
        setState(() => step = 3);
        return;
      }
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
    );
    if (picked != null) setState(() => selectedDate = picked);
  }

  void _resetAll() {
    setState(() {
      step = 1;
      selectedDepartment = null;
      selectedService = null;
      selectedDoctor = null;
      selectedDate = null;
      selectedTime = null;
      reasonCtrl.clear();
      doctorMode = apt.DoctorSelectionMode.automatic;
      chosenDoctor = null;
      _patientType = PatientType.regular;
    });
  }

  void _confirmAppointment() {
    if (!canConfirm) return;

    final dept = selectedDepartment!;
    final serviceName = _isLabOrRadio ? selectedService!.name : "Consultation";

    qm.Doctor? doc;
    if (_isLabOrRadio) {
      final autoDoc = automaticDoctorOrNull;
      doc = (doctorMode == apt.DoctorSelectionMode.automatic)
          ? (autoDoc ?? selectedDoctor)
          : (chosenDoctor ?? autoDoc ?? selectedDoctor);
    } else {
      doc = selectedDoctor;
    }

    doc ??= const qm.Doctor(
      id: "na",
      departmentId: "na",
      name: "No doctor available",
      specialization: "",
    );

    final patientTypeLabel =
        _patientType == PatientType.regular ? "Regular" : "Priority";

    // create appointment using apt.Appointment
    final newApt = apt.Appointment(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      departmentId: dept.id,
      departmentName: dept.name,
      serviceName: serviceName,
      doctorId: doc.id,
      doctorName: doc.name,
      date: selectedDate!,
      timeLabel: selectedTime!,
      patientTypeLabel: patientTypeLabel,
      status: apt.AppointmentStatus.confirmed,
      notes: reasonCtrl.text.trim().isEmpty ? null : reasonCtrl.text.trim(),
    );

    Navigator.pop(context, newApt);
  }

  @override
  Widget build(BuildContext context) {
    final subtitle = step == 1
        ? "Choose a department"
        : step == 2
            ? (_isLabOrRadio ? "Choose a specific service" : "Choose a doctor")
            : "Select schedule & enter details";

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: _goBack,
        ),
        title: const Text(
          "Book Appointment",
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Column(
            children: [
              const Divider(height: 1, color: AppColors.border),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        subtitle,
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    _StepPill(step: step, total: 3),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: SafeArea(
        child: step == 1
            ? _StepSelectDepartment(
                selectedDepartmentId: selectedDepartment?.id,
                onSelect: (d) => setState(() {
                  selectedDepartment = d;
                  selectedService = null;
                  selectedDoctor = null;
                  selectedDate = null;
                  selectedTime = null;
                  doctorMode = apt.DoctorSelectionMode.automatic;
                  chosenDoctor = null;
                }),
              )
            : step == 2
                ? (_isLabOrRadio
                    ? _StepSelectService(
                        department: selectedDepartment!,
                        selectedServiceId: selectedService?.id,
                        onSelect: (s) => setState(() => selectedService = s),
                      )
                    : _StepSelectDoctor(
                        department: selectedDepartment!,
                        selectedDoctorId: selectedDoctor?.id,
                        onSelect: (d) => setState(() => selectedDoctor = d),
                      ))
                : _StepDetails(
                    department: selectedDepartment!,
                    isLabOrRadio: _isLabOrRadio,
                    selectedService: selectedService,
                    selectedDoctor: selectedDoctor,
                    doctors: departmentDoctors,
                    doctorMode: doctorMode,
                    onDoctorModeChanged: (m) => setState(() => doctorMode = m),
                    chosenDoctor: chosenDoctor,
                    onChooseDoctor: (d) => setState(() => chosenDoctor = d),
                    autoDoctor: automaticDoctorOrNull,
                    selectedDate: selectedDate,
                    selectedTime: selectedTime,
                    onPickDate: _pickDate,
                    timeSlots: getTimeSlots(),
                    fullyBooked: fullyBooked,
                    onSelectTime: (t) => setState(() => selectedTime = t),
                    patientType: _patientType,
                    onPatientTypeChanged: (p) =>
                        setState(() => _patientType = p),
                    reasonCtrl: reasonCtrl,
                    canConfirm: canConfirm,
                    onConfirm: _confirmAppointment,
                    onReset: _resetAll,
                  ),
      ),
      bottomNavigationBar: const _BottomNavMock(selectedIndex: 1),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: step == 3
          ? null
          : Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: (step == 1 && selectedDepartment == null) ||
                          (step == 2 &&
                              _isLabOrRadio &&
                              selectedService == null) ||
                          (step == 2 &&
                              !_isLabOrRadio &&
                              selectedDoctor == null)
                      ? null
                      : _continue,
                  child: const Text(
                    "Continue",
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            ),
    );
  }
}

/* ---------------------------
   STEP 1: DEPARTMENT
--------------------------- */
class _StepSelectDepartment extends StatelessWidget {
  final String? selectedDepartmentId;
  final void Function(qm.Department) onSelect;

  const _StepSelectDepartment({
    required this.selectedDepartmentId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final depts = hospital.departments;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Select Department",
            style: TextStyle(
              fontWeight: FontWeight.w900,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            "Choose a department for your visit",
            style: TextStyle(color: AppColors.textMuted, fontSize: 12.5),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.only(bottom: 90),
              itemCount: depts.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.05,
              ),
              itemBuilder: (context, i) {
                final d = depts[i];
                final selected = selectedDepartmentId == d.id;

                final borderColor =
                    selected ? AppColors.primary : AppColors.border;
                final borderWidth = selected ? 1.6 : 1.0;

                return InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => onSelect(d),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOut,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border:
                          Border.all(color: borderColor, width: borderWidth),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 12,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.10),
                            shape: BoxShape.circle,
                          ),
                          child:
                              Icon(d.icon, color: AppColors.primary, size: 24),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          d.name,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            color: AppColors.textDark,
                            fontSize: 13,
                            height: 1.15,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          d.description,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 11.2,
                            height: 1.2,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/* ---------------------------
   STEP 2A: SERVICE (LAB/RADIO)
--------------------------- */
class _StepSelectService extends StatelessWidget {
  final qm.Department department;
  final String? selectedServiceId;
  final void Function(qm.ServiceItem) onSelect;

  const _StepSelectService({
    required this.department,
    required this.selectedServiceId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final list = hospital.services
        .where((s) => s.departmentId == department.id)
        .toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Select Specific Service",
            style: TextStyle(
                fontWeight: FontWeight.w900, color: AppColors.textDark),
          ),
          const SizedBox(height: 6),
          Text(
            department.description,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: list.isEmpty
                ? const Center(
                    child: Text(
                      "No services available for this department yet.",
                      style: TextStyle(
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w700),
                    ),
                  )
                : ListView.separated(
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final s = list[i];
                      final isSelected = selectedServiceId == s.id;

                      return InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => onSelect(s),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.primary
                                  : AppColors.border,
                              width: isSelected ? 1.4 : 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.03),
                                blurRadius: 10,
                                offset: const Offset(0, 6),
                              )
                            ],
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      s.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w900,
                                        color: AppColors.textDark,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      s.description,
                                      style: const TextStyle(
                                          color: AppColors.textMuted,
                                          fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(Icons.chevron_right,
                                  color: AppColors.textMuted),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

/* ---------------------------
   STEP 2B: DOCTOR (OTHER DEPTS)
--------------------------- */
class _StepSelectDoctor extends StatelessWidget {
  final qm.Department department;
  final String? selectedDoctorId;
  final void Function(qm.Doctor) onSelect;

  const _StepSelectDoctor({
    required this.department,
    required this.selectedDoctorId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final docs =
        hospital.doctors.where((d) => d.departmentId == department.id).toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Select Doctor",
            style: TextStyle(
                fontWeight: FontWeight.w900, color: AppColors.textDark),
          ),
          const SizedBox(height: 6),
          Text(
            department.description,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: docs.isEmpty
                ? const Center(
                    child: Text(
                      "No doctors available for this department yet.",
                      style: TextStyle(
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w700),
                    ),
                  )
                : ListView.separated(
                    itemCount: docs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final d = docs[i];
                      final isSelected = selectedDoctorId == d.id;

                      return InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => onSelect(d),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.primary
                                  : AppColors.border,
                              width: isSelected ? 1.4 : 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.03),
                                blurRadius: 10,
                                offset: const Offset(0, 6),
                              )
                            ],
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      d.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w900,
                                        color: AppColors.textDark,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      d.specialization,
                                      style: const TextStyle(
                                          color: AppColors.textMuted,
                                          fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(Icons.chevron_right,
                                  color: AppColors.textMuted),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

/* ---------------------------
   STEP 3: DETAILS
--------------------------- */
class _StepDetails extends StatelessWidget {
  final qm.Department department;
  final bool isLabOrRadio;

  final qm.ServiceItem? selectedService;
  final qm.Doctor? selectedDoctor;

  final List<qm.Doctor> doctors;
  final apt.DoctorSelectionMode doctorMode;
  final void Function(apt.DoctorSelectionMode) onDoctorModeChanged;

  final qm.Doctor? chosenDoctor;
  final void Function(qm.Doctor) onChooseDoctor;

  final qm.Doctor? autoDoctor;

  final DateTime? selectedDate;
  final String? selectedTime;
  final VoidCallback onPickDate;

  final List<String> timeSlots;
  final Set<String> fullyBooked;
  final void Function(String) onSelectTime;

  final PatientType patientType;
  final void Function(PatientType) onPatientTypeChanged;

  final TextEditingController reasonCtrl;

  final bool canConfirm;
  final VoidCallback onConfirm;
  final VoidCallback onReset;

  const _StepDetails({
    required this.department,
    required this.isLabOrRadio,
    required this.selectedService,
    required this.selectedDoctor,
    required this.doctors,
    required this.doctorMode,
    required this.onDoctorModeChanged,
    required this.chosenDoctor,
    required this.onChooseDoctor,
    required this.autoDoctor,
    required this.selectedDate,
    required this.selectedTime,
    required this.onPickDate,
    required this.timeSlots,
    required this.fullyBooked,
    required this.onSelectTime,
    required this.patientType,
    required this.onPatientTypeChanged,
    required this.reasonCtrl,
    required this.canConfirm,
    required this.onConfirm,
    required this.onReset,
  });

  String _formatDate(DateTime? d) {
    if (d == null) return "Select a date";
    return "${d.month.toString().padLeft(2, '0')}/${d.day.toString().padLeft(2, '0')}/${d.year}";
  }

  @override
  Widget build(BuildContext context) {
    final headerLabel = isLabOrRadio
        ? "${department.name} — ${selectedService?.name ?? ""}"
        : "${department.name} — Consultation";

    final bool isRegular = patientType == PatientType.regular;
    final Color accent =
        isRegular ? const Color(0xFF3B82F6) : const Color(0xFFEA580C);
    final Color fill =
        isRegular ? const Color(0xFFEFF6FF) : const Color(0xFFFFF7ED);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Selected",
                    style: TextStyle(
                        color: AppColors.primary, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    headerLabel,
                    style: const TextStyle(
                      color: AppColors.textDark,
                      fontWeight: FontWeight.w800,
                      fontSize: 12.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  if (!isLabOrRadio && selectedDoctor != null)
                    Text(
                      "Doctor: ${selectedDoctor!.name}",
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            const Text("Select Date",
                style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: onPickDate,
              child: Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _formatDate(selectedDate),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                    const Icon(Icons.calendar_today_outlined,
                        size: 18, color: AppColors.textMuted),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Text("Select Time",
                style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: timeSlots.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 2.4,
              ),
              itemBuilder: (context, i) {
                final t = timeSlots[i];
                final booked = fullyBooked.contains(t);
                final selected = selectedTime == t;

                return InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: booked ? null : () => onSelectTime(t),
                  child: Container(
                    decoration: BoxDecoration(
                      color: booked
                          ? const Color(0xFFF3F4F6)
                          : selected
                              ? const Color(0xFFEFF6FF)
                              : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: selected ? AppColors.primary : AppColors.border,
                        width: selected ? 1.4 : 1,
                      ),
                    ),
                    child: Center(
                      child: booked
                          ? const Text(
                              "Fully Booked",
                              style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textMuted,
                                  fontWeight: FontWeight.w800),
                            )
                          : Text(
                              t,
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                color: selected
                                    ? AppColors.primary
                                    : AppColors.textDark,
                              ),
                            ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: const Text(
                "Peak Hours: 9-11 AM and 2-4 PM may have longer wait times",
                style: TextStyle(
                    color: Color(0xFF92400E),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 16),
            const Text("Patient Type",
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
            const SizedBox(height: 6),
            SizedBox(
              width: double.infinity,
              child: DropdownButtonFormField<PatientType>(
                value: patientType,
                isExpanded: true,
                menuMaxHeight: 180,
                borderRadius: BorderRadius.circular(14),
                dropdownColor: Colors.white,
                icon: Icon(Icons.keyboard_arrow_down_rounded, color: accent),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: fill,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: accent, width: 1.4),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: accent, width: 1.4),
                  ),
                ),
                items: const [
                  DropdownMenuItem(
                    value: PatientType.regular,
                    child: _PatientTypeMenuTile(
                      label: "Regular",
                      accent: Color(0xFF3B82F6),
                    ),
                  ),
                  DropdownMenuItem(
                    value: PatientType.priority,
                    child: _PatientTypeMenuTile(
                      label: "Priority (Senior / PWD / Pregnant)",
                      accent: Color(0xFFEA580C),
                    ),
                  ),
                ],
                onChanged: (value) {
                  if (value == null) return;
                  onPatientTypeChanged(value);
                },
              ),
            ),
            const SizedBox(height: 12),
            const Text("Reason for Visit (Optional)",
                style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            TextField(
              controller: reasonCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: "Brief description of your concern",
              ),
            ),
            if (isLabOrRadio) ...[
              const SizedBox(height: 16),
              const Text("Doctor Selection",
                  style: TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 10),
              _ToggleTabs(
                left: "Automatic",
                right: "Choose Doctor",
                selectedLeft: doctorMode == apt.DoctorSelectionMode.automatic,
                onLeft: () =>
                    onDoctorModeChanged(apt.DoctorSelectionMode.automatic),
                onRight: () =>
                    onDoctorModeChanged(apt.DoctorSelectionMode.chooseDoctor),
              ),
              const SizedBox(height: 10),
              if (doctorMode == apt.DoctorSelectionMode.automatic)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Automatic Assignment:",
                        style: TextStyle(
                            fontWeight: FontWeight.w900,
                            color: AppColors.primary),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        "The system will assign the first available doctor for your selected time slot.",
                        style: TextStyle(
                            color: AppColors.textDark,
                            fontWeight: FontWeight.w700,
                            fontSize: 12.5),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        autoDoctor == null
                            ? "Next available: (No doctor available)"
                            : "Next available: ${autoDoctor!.name}",
                        style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w900,
                            fontSize: 12.5),
                      ),
                    ],
                  ),
                )
              else
                _DoctorPicker(
                  doctors: doctors,
                  selectedDoctor: chosenDoctor,
                  onPick: onChooseDoctor,
                ),
            ],
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: canConfirm ? onConfirm : null,
                child: const Text("Confirm Appointment",
                    style: TextStyle(fontWeight: FontWeight.w900)),
              ),
            ),
            const SizedBox(height: 10),
            Center(
              child: TextButton(
                onPressed: onReset,
                child: const Text("Start Over"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/* ---------------------------
   SMALL UI + HELPERS
--------------------------- */
class _StepPill extends StatelessWidget {
  final int step;
  final int total;
  const _StepPill({required this.step, required this.total});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(
        "Step $step of $total",
        style: const TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w900,
          color: AppColors.textMuted,
        ),
      ),
    );
  }
}

class _ToggleTabs extends StatelessWidget {
  final String left;
  final String right;
  final bool selectedLeft;
  final VoidCallback onLeft;
  final VoidCallback onRight;

  const _ToggleTabs({
    required this.left,
    required this.right,
    required this.selectedLeft,
    required this.onLeft,
    required this.onRight,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 42,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: onLeft,
              child: Container(
                decoration: BoxDecoration(
                  color: selectedLeft ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: selectedLeft
                      ? [
                          BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4))
                        ]
                      : null,
                ),
                child: Center(
                  child: Text(
                    left,
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: selectedLeft
                          ? AppColors.primary
                          : AppColors.textMuted,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: onRight,
              child: Container(
                decoration: BoxDecoration(
                  color: !selectedLeft ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: !selectedLeft
                      ? [
                          BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4))
                        ]
                      : null,
                ),
                child: Center(
                  child: Text(
                    right,
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: !selectedLeft
                          ? AppColors.primary
                          : AppColors.textMuted,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DoctorPicker extends StatelessWidget {
  final List<qm.Doctor> doctors;
  final qm.Doctor? selectedDoctor;
  final void Function(qm.Doctor) onPick;

  const _DoctorPicker({
    required this.doctors,
    required this.selectedDoctor,
    required this.onPick,
  });

  @override
  Widget build(BuildContext context) {
    if (doctors.isEmpty) {
      return const Text("No doctors available",
          style: TextStyle(color: AppColors.textMuted));
    }

    return Column(
      children: doctors.map((d) {
        final selected = selectedDoctor?.id == d.id;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => onPick(d),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: selected ? const Color(0xFFEFF6FF) : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selected ? AppColors.primary : AppColors.border,
                  width: selected ? 1.4 : 1,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(d.name,
                            style:
                                const TextStyle(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 3),
                        Text(
                          d.specialization,
                          style: const TextStyle(
                              color: AppColors.textMuted,
                              fontWeight: FontWeight.w700,
                              fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  if (selected)
                    const Icon(Icons.check_circle, color: AppColors.primary),
                ],
              ),
            ),
          ),
        );
      }).toList(),
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

class _PatientTypeMenuTile extends StatelessWidget {
  final String label;
  final Color accent;

  const _PatientTypeMenuTile({
    required this.label,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      width: double.infinity,
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          label,
          style: TextStyle(fontWeight: FontWeight.w800, color: accent),
        ),
      ),
    );
  }
}

enum PatientType { regular, priority }
