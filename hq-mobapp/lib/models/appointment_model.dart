class Appointment {
  final String id;
  final String clinicName;
  final String clinicAddress;
  final String clinicContact;
  final String serviceName;
  final DateTime appointmentDate;
  final String timeSlot;
  final String endTime;
  final String status;
  final String reason;
  final String notes;
  final String patientType;

  Appointment({
    required this.id,
    required this.clinicName,
    required this.clinicAddress,
    required this.clinicContact,
    required this.serviceName,
    required this.appointmentDate,
    required this.timeSlot,
    required this.endTime,
    required this.status,
    required this.reason,
    required this.notes,
    required this.patientType,
  });

  factory Appointment.fromJson(Map<String, dynamic> j) {
    final clinic = j['clinic'] as Map<String, dynamic>? ?? {};
    return Appointment(
      id: j['_id']?.toString() ?? '',
      clinicName: clinic['name'] ?? '',
      clinicAddress: clinic['address'] ?? '',
      clinicContact: clinic['contactNumber'] ?? '',
      serviceName: j['serviceName'] ?? '',
      appointmentDate: DateTime.tryParse(j['appointmentDate'] ?? '') ?? DateTime.now(),
      timeSlot: j['timeSlot'] ?? '',
      endTime: j['endTime'] ?? '',
      status: j['status'] ?? 'pending',
      reason: j['reason'] ?? '',
      notes: j['notes'] ?? '',
      patientType: j['patientType'] ?? 'Regular',
    );
  }

  bool get isUpcoming {
    final statuses = ['pending', 'confirmed'];
    return statuses.contains(status) && appointmentDate.isAfter(DateTime.now());
  }

  bool get isPast {
    return ['completed', 'cancelled', 'no_show'].contains(status) ||
        appointmentDate.isBefore(DateTime.now());
  }
}
