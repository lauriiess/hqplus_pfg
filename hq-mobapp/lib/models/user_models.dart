class AppUser {
  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String role;
  final String? token;
  final String patientType;
  final String patientId;
  final String age;
  final String philHealthNumber;
  final String hmoNumber;

  const AppUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    this.role = 'patient',
    this.token,
    this.patientType = 'Regular Patient',
    this.patientId = '',
    this.age = '',
    this.philHealthNumber = '',
    this.hmoNumber = '',
  });

  factory AppUser.fromJson(Map<String, dynamic> j, {String? token}) => AppUser(
    id:       j['_id']?.toString() ?? j['id']?.toString() ?? '',
    fullName: j['fullName'] ?? '',
    email:    j['email']    ?? '',
    phone:    j['phone']    ?? '',
    role:     j['role']     ?? 'patient',
    token:    token,
  );

  AppUser copyWith({
    String? fullName, String? phone, String? age,
    String? patientType, String? philHealthNumber, String? hmoNumber,
  }) => AppUser(
    id: id, fullName: fullName ?? this.fullName,
    email: email, phone: phone ?? this.phone,
    role: role, token: token,
    patientType: patientType ?? this.patientType,
    patientId: patientId, age: age ?? this.age,
    philHealthNumber: philHealthNumber ?? this.philHealthNumber,
    hmoNumber: hmoNumber ?? this.hmoNumber,
  );
}
