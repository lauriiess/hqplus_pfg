class QueueEntry {
  final String id;
  final String queueNumber;
  final String clinicName;
  final String clinicAddress;
  final String serviceName;
  final String status;
  final DateTime joinedAt;
  final int estimatedWaitMinutes;
  final int patientsAhead;
  final String patientType;

  QueueEntry({
    required this.id,
    required this.queueNumber,
    required this.clinicName,
    required this.clinicAddress,
    required this.serviceName,
    required this.status,
    required this.joinedAt,
    required this.estimatedWaitMinutes,
    required this.patientsAhead,
    required this.patientType,
  });

  factory QueueEntry.fromJson(Map<String, dynamic> j) {
    final clinic = j['clinic'] as Map<String, dynamic>? ?? {};
    return QueueEntry(
      id: j['_id']?.toString() ?? '',
      queueNumber: j['queueNumber'] ?? '',
      clinicName: clinic['name'] ?? '',
      clinicAddress: clinic['address'] ?? '',
      serviceName: j['serviceName'] ?? '',
      status: j['status'] ?? 'waiting',
      joinedAt: DateTime.tryParse(j['joinedAt'] ?? '') ?? DateTime.now(),
      estimatedWaitMinutes: j['estimatedWaitMinutes'] ?? 0,
      patientsAhead: j['patientsAhead'] ?? 0,
      patientType: j['patientType'] ?? 'Regular',
    );
  }
}
