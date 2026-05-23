class PeakHour {
  final String hour;
  final int load;
  const PeakHour({required this.hour, required this.load});
  factory PeakHour.fromJson(Map<String, dynamic> j) =>
      PeakHour(hour: j['hour'] ?? '', load: (j['load'] ?? 0) as int);
}

class Clinic {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final List<String> services;
  final int baseWaitTimePerPerson;
  final int queueLength;
  final double distanceKm;
  final int currentWaitingTime;
  final String contactNumber;
  final String status;
  final List<PeakHour> peakHours;

  const Clinic({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.services,
    required this.baseWaitTimePerPerson,
    required this.queueLength,
    required this.distanceKm,
    required this.currentWaitingTime,
    required this.contactNumber,
    required this.status,
    required this.peakHours,
  });

  factory Clinic.fromJson(Map<String, dynamic> j) => Clinic(
    id:                  j['_id']?.toString() ?? j['id']?.toString() ?? '',
    name:                j['name'] ?? '',
    address:             j['address'] ?? '',
    latitude:            (j['latitude']  ?? 0).toDouble(),
    longitude:           (j['longitude'] ?? 0).toDouble(),
    services:            List<String>.from(j['services'] ?? []),
    baseWaitTimePerPerson: (j['baseWaitTimePerPerson'] ?? 10) as int,
    queueLength:         (j['queueLength'] ?? 0) as int,
    distanceKm:          (j['distanceKm'] ?? 0).toDouble(),
    currentWaitingTime:  (j['currentWaitingTime'] ?? 0) as int,
    contactNumber:       j['contactNumber'] ?? '',
    status:              j['status'] ?? 'open',
    peakHours:           (j['peakHours'] as List? ?? [])
                           .map((h) => PeakHour.fromJson(h as Map<String, dynamic>))
                           .toList(),
  );
}
