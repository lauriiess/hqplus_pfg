// Matches server Appointment model enum exactly:
// pending → confirmed → arrived → serving → completed / no_show / cancelled / rescheduled
enum AppointmentStatus { pending, confirmed, arrived, serving, completed, noShow, cancelled, rescheduled }

class Appointment {
  final String id;
  final String clinicName;
  final String clinicAddress;
  final String serviceName;
  final DateTime date;
  final String timeLabel;
  final AppointmentStatus status;
  final String notes;

  const Appointment({
    required this.id,
    required this.clinicName,
    required this.clinicAddress,
    required this.serviceName,
    required this.date,
    required this.timeLabel,
    required this.status,
    this.notes = '',
  });

  factory Appointment.fromJson(Map<String, dynamic> j) => Appointment(
    id:           j['_id']?.toString() ?? j['id']?.toString() ?? '',
    clinicName:   (j['clinic'] is Map ? j['clinic']['name'] : null) ?? j['clinicName'] ?? '',
    clinicAddress:(j['clinic'] is Map ? j['clinic']['address'] : null) ?? j['clinicAddress'] ?? '',
    serviceName:  j['serviceName'] ?? '',
    date:         j['appointmentDate'] != null
                    ? DateTime.tryParse(j['appointmentDate'].toString()) ?? DateTime.now()
                    : DateTime.now(),
    timeLabel:    j['timeSlot'] ?? '',
    status:       _parseStatus(j['status']?.toString() ?? ''),
    notes:        j['notes'] ?? '',
  );

  static AppointmentStatus _parseStatus(String s) {
    switch (s.toLowerCase()) {
      case 'pending':      return AppointmentStatus.pending;
      case 'confirmed':    return AppointmentStatus.confirmed;
      case 'arrived':      return AppointmentStatus.arrived;
      case 'serving':      return AppointmentStatus.serving;
      case 'completed':    return AppointmentStatus.completed;
      case 'no_show':      return AppointmentStatus.noShow;
      case 'cancelled':    return AppointmentStatus.cancelled;
      case 'rescheduled':  return AppointmentStatus.rescheduled;
      default:             return AppointmentStatus.pending;
    }
  }

  Appointment copyWith({AppointmentStatus? status, DateTime? date, String? timeLabel, String? notes}) =>
      Appointment(
        id: id, clinicName: clinicName, clinicAddress: clinicAddress,
        serviceName: serviceName,
        date:      date      ?? this.date,
        timeLabel: timeLabel ?? this.timeLabel,
        status:    status    ?? this.status,
        notes:     notes     ?? this.notes,
      );
}

class QueueJoinResult {
  final String queueNumber;
  final String clinicName;
  final String serviceName;
  final int estimatedWaitTime;
  final int peopleAhead;

  const QueueJoinResult({
    required this.queueNumber,
    required this.clinicName,
    required this.serviceName,
    required this.estimatedWaitTime,
    required this.peopleAhead,
  });
}
