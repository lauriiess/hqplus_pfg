// Synced with hq-server: pending, confirmed, arrived, serving, completed, noShow, cancelled, rescheduled
enum AppointmentStatus {
  pending,
  scheduled,   // alias — kept for local booking flow
  confirmed,
  arrived,
  serving,
  inProgress,  // alias
  completed,
  noShow,
  cancelled,
  rescheduled,
}

enum DoctorSelectionMode { automatic, chooseDoctor }

class Appointment {
  final String id;

  // Server field names
  final String clinicName;
  final String department;   // service/department label shown in UI
  final String doctor;       // doctor name shown in UI

  // Legacy fields (kept for local booking)
  final String departmentId;
  final String departmentName;
  final String serviceName;
  final String doctorId;
  final String doctorName;

  final DateTime date;
  final String timeLabel;
  final String patientTypeLabel;
  final String? notes;
  final AppointmentStatus status;

  const Appointment({
    required this.id,
    this.clinicName = '',
    this.department = '',
    this.doctor = '',
    this.departmentId = '',
    this.departmentName = '',
    this.serviceName = '',
    this.doctorId = '',
    this.doctorName = '',
    required this.date,
    required this.timeLabel,
    this.patientTypeLabel = 'Regular',
    required this.status,
    this.notes,
  });

  Appointment copyWith({
    AppointmentStatus? status,
    String? timeLabel,
    DateTime? date,
    String? notes,
  }) {
    return Appointment(
      id: id,
      clinicName: clinicName,
      department: department,
      doctor: doctor,
      departmentId: departmentId,
      departmentName: departmentName,
      serviceName: serviceName,
      doctorId: doctorId,
      doctorName: doctorName,
      date: date ?? this.date,
      timeLabel: timeLabel ?? this.timeLabel,
      patientTypeLabel: patientTypeLabel,
      status: status ?? this.status,
      notes: notes ?? this.notes,
    );
  }
}
