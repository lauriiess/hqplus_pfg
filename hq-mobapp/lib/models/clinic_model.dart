class ClinicService {
  final String id;
  final String name;
  final String description;
  final int durationMinutes;
  final bool isAvailable;

  ClinicService({
    required this.id,
    required this.name,
    required this.description,
    required this.durationMinutes,
    required this.isAvailable,
  });

  factory ClinicService.fromJson(Map<String, dynamic> j) => ClinicService(
        id: j['_id']?.toString() ?? '',
        name: j['name'] ?? '',
        description: j['description'] ?? '',
        durationMinutes: j['durationMinutes'] ?? 30,
        isAvailable: j['isAvailable'] ?? true,
      );
}

class Clinic {
  final String id;
  final String name;
  final String address;
  final String city;
  final String contactNumber;
  final String email;
  final String operatingHours;
  final bool acceptsWalkIn;
  final bool acceptsAppointment;
  final int maxQueueCapacity;
  final List<ClinicService> services;
  final String status;
  // Live stats (from directory endpoint)
  final int activeQueueCount;
  final int estimatedWaitMinutes;
  final double? distanceKm;

  Clinic({
    required this.id,
    required this.name,
    required this.address,
    required this.city,
    required this.contactNumber,
    required this.email,
    required this.operatingHours,
    required this.acceptsWalkIn,
    required this.acceptsAppointment,
    required this.maxQueueCapacity,
    required this.services,
    required this.status,
    this.activeQueueCount = 0,
    this.estimatedWaitMinutes = 0,
    this.distanceKm,
  });

  factory Clinic.fromJson(Map<String, dynamic> j) => Clinic(
        id: j['_id']?.toString() ?? '',
        name: j['name'] ?? '',
        address: j['address'] ?? '',
        city: j['city'] ?? '',
        contactNumber: j['contactNumber'] ?? '',
        email: j['email'] ?? '',
        operatingHours: j['operatingHours'] ?? '',
        acceptsWalkIn: j['acceptsWalkIn'] ?? true,
        acceptsAppointment: j['acceptsAppointment'] ?? true,
        maxQueueCapacity: j['maxQueueCapacity'] ?? 50,
        services: (j['services'] as List<dynamic>? ?? [])
            .map((s) => ClinicService.fromJson(s as Map<String, dynamic>))
            .toList(),
        status: j['status'] ?? 'active',
        activeQueueCount: j['activeQueueCount'] ?? 0,
        estimatedWaitMinutes: j['estimatedWaitMinutes'] ?? 0,
        distanceKm: j['distanceKm']?.toDouble(),
      );
}
