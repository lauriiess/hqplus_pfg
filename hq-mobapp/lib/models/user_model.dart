class AppUser {
  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String role;
  final String? clinicId;
  final bool isVerified;

  AppUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.role,
    this.clinicId,
    this.isVerified = false,
  });

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id']?.toString() ?? '',
        fullName: j['fullName'] ?? '',
        email: j['email'] ?? '',
        phone: j['phone'] ?? '',
        role: j['role'] ?? 'patient',
        clinicId: j['clinicId']?.toString(),
        isVerified: j['isVerified'] ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'role': role,
        'clinicId': clinicId,
        'isVerified': isVerified,
      };
}
