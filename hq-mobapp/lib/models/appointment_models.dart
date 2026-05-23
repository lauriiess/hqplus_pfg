enum AppointmentStatus { scheduled, confirmed, inProgress, completed, cancelled }

class Appointment {
  final String id;
  final String clinicId;
  final String clinicName;
  final String clinicAddress;
  final String serviceName;
  final DateTime date;
  final String timeLabel;
  final String? notes;
  final AppointmentStatus status;

  const Appointment({
    required this.id,
    required this.clinicId,
    required this.clinicName,
    this.clinicAddress = '',
    required this.serviceName,
    required this.date,
    required this.timeLabel,
    this.notes,
    required this.status,
  });

  factory Appointment.fromJson(Map<String, dynamic> j) {
    final clinic = j['clinic'];
    return Appointment(
      id:           j['_id']?.toString() ?? j['id']?.toString() ?? '',
      clinicId:     clinic is Map ? (clinic['_id'] ?? '').toString() : (j['clinicId'] ?? '').toString(),
      clinicName:   clinic is Map ? (clinic['name'] ?? 'Clinic') : (j['clinicName'] ?? 'Clinic'),
      clinicAddress:clinic is Map ? (clinic['address'] ?? '') : '',
      serviceName:  j['serviceName'] ?? '',
      date:         j['appointmentDate'] != null
                      ? DateTime.tryParse(j['appointmentDate']) ?? DateTime.now()
                      : DateTime.now(),
      timeLabel:    j['timeSlot'] ?? '',
      notes:        j['notes'],
      status:       _parseStatus(j['status']?.toString() ?? ''),
    );
  }

  static AppointmentStatus _parseStatus(String s) {
    switch (s.toLowerCase()) {
      case 'confirmed':   return AppointmentStatus.confirmed;
      case 'in_progress':
      case 'inprogress':  return AppointmentStatus.inProgress;
      case 'completed':   return AppointmentStatus.completed;
      case 'cancelled':   return AppointmentStatus.cancelled;
      default:             return AppointmentStatus.scheduled;
    }
  }

  Appointment copyWith({AppointmentStatus? status, DateTime? date, String? timeLabel, String? notes}) =>
    Appointment(
      id: id, clinicId: clinicId, clinicName: clinicName, clinicAddress: clinicAddress,
      serviceName: serviceName, date: date ?? this.date, timeLabel: timeLabel ?? this.timeLabel,
      notes: notes ?? this.notes, status: status ?? this.status,
    );
}
