import 'package:flutter/material.dart';

enum QueueType { regular, priority }

enum QueueStatus { waiting, inProgress, completed, missed }

enum PatientType { regular, priority }

class QueueEntry {
  final String? id;

  final String queueNumber;
  final QueueType queueType;

  final String departmentId;
  final String departmentName;

  final String serviceId;
  final String serviceName;

  final String? doctorId;
  final String? doctorName;

  final DateTime joinedAt;
  final int position;
  final int totalAhead;
  final int estimatedWaitTimeMinutes;
  final QueueStatus status;

  const QueueEntry({
    this.id,

    required this.queueNumber,
    required this.queueType,
    required this.departmentId,
    required this.departmentName,
    required this.serviceId,
    required this.serviceName,
    this.doctorId,
    this.doctorName,
    required this.joinedAt,
    required this.position,
    required this.totalAhead,
    required this.estimatedWaitTimeMinutes,
    required this.status,
  });
}

class QueueJoinResult {
  final String? id;

  final String patientName;
  final String? patientEmail;
  final String? patientPhone;

  final String departmentId;
  final String departmentName;

  final String serviceId;
  final String serviceName;

  final String? doctorId;
  final String? doctorName;

  final QueueType queueType;
  final String queueNumber;

  final int position;
  final int totalAhead;
  final int estimatedWaitTimeMinutes;
  final DateTime joinedAt;

  const QueueJoinResult({
    this.id,

    required this.patientName,
    this.patientEmail,
    this.patientPhone,
    required this.departmentId,
    required this.departmentName,
    required this.serviceId,
    required this.serviceName,
    this.doctorId,
    this.doctorName,
    required this.queueType,
    required this.queueNumber,
    required this.position,
    required this.totalAhead,
    required this.estimatedWaitTimeMinutes,
    required this.joinedAt,
  });
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
