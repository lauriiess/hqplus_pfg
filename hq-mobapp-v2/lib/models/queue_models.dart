import 'package:flutter/material.dart';

// Synced with hq-server: pending, confirmed, serving, completed, noShow, cancelled
enum QueueStatus { pending, confirmed, serving, completed, noShow, cancelled, waiting }

enum QueueType { regular, priority }
enum PatientType { regular, priority }

class QueueEntry {
  final String id;
  final String queueNumber;

  // Clinic / service info from server
  final String clinicName;
  final String serviceName;

  // Legacy department fields (kept for local booking flow)
  final String departmentId;
  final String departmentName;
  final String serviceId;

  final String? doctorId;
  final String? doctorName;

  // Patient info
  final String patientName;
  final String? patientEmail;
  final String? patientPhone;

  final QueueType queueType;
  final QueueStatus status;

  final DateTime joinedAt;
  final int position;
  final int totalAhead;
  final int estimatedWait; // minutes

  const QueueEntry({
    required this.id,
    required this.queueNumber,
    this.clinicName = '',
    this.serviceName = '',
    this.departmentId = '',
    this.departmentName = '',
    this.serviceId = '',
    this.doctorId,
    this.doctorName,
    this.patientName = '',
    this.patientEmail,
    this.patientPhone,
    this.queueType = QueueType.regular,
    required this.status,
    required this.joinedAt,
    this.position = 0,
    this.totalAhead = 0,
    this.estimatedWait = 0,
  });
}

class QueueJoinResult {
  final String entryId;
  final String queueNumber;
  final String clinicName;
  final String serviceName;
  final int position;
  final int estimatedWait;

  // Legacy fields kept for local flows
  final String departmentId;
  final String departmentName;
  final String serviceId;
  final String patientName;
  final String? patientEmail;
  final String? patientPhone;
  final QueueType queueType;
  final int totalAhead;
  final DateTime joinedAt;

  const QueueJoinResult({
    required this.entryId,
    required this.queueNumber,
    this.clinicName = '',
    this.serviceName = '',
    this.position = 0,
    this.estimatedWait = 0,
    this.departmentId = '',
    this.departmentName = '',
    this.serviceId = '',
    this.patientName = '',
    this.patientEmail,
    this.patientPhone,
    this.queueType = QueueType.regular,
    this.totalAhead = 0,
    DateTime? joinedAt,
  }) : joinedAt = joinedAt ?? const _DateTimeNow();
}

// Helper so const constructor can set a default DateTime
class _DateTimeNow implements DateTime {
  const _DateTimeNow();
  @override dynamic noSuchMethod(Invocation i) => DateTime.now();
}

class Department {
  final String id;
  final String name;
  final String description;
  final IconData icon;

  const Department({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
  });
}

class Doctor {
  final String id;
  final String departmentId;
  final String name;
  final String specialization;

  const Doctor({
    required this.id,
    required this.departmentId,
    required this.name,
    required this.specialization,
  });
}

class ServiceItem {
  final String id;
  final String departmentId;
  final String name;
  final String description;

  const ServiceItem({
    required this.id,
    required this.departmentId,
    required this.name,
    required this.description,
  });
}
