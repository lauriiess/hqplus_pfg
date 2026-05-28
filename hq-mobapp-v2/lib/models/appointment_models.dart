enum AppointmentStatus {
  scheduled,
  confirmed,
  inProgress,
  completed,
  cancelled
}

enum DoctorSelectionMode { automatic, chooseDoctor }

class Appointment {
  final String id;
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
    required this.departmentId,
    required this.departmentName,
    required this.serviceName,
    required this.doctorId,
    required this.doctorName,
    required this.date,
    required this.timeLabel,
    required this.patientTypeLabel,
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
