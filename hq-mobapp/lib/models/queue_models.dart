import 'package:flutter/material.dart';

enum QueueType   { regular, priority }
enum QueueStatus { waiting, inProgress, completed, missed }
enum PatientType { regular, priority }

class QueueEntry {
  final String  entryId;        // MongoDB _id — used for API cancel calls
  final String  queueNumber;    // display ticket number e.g. "H-001"
  final QueueType queueType;
  final String  clinicId;
  final String  clinicName;
  final String  serviceId;
  final String  serviceName;
  final DateTime joinedAt;
  final int     position;
  final int     totalAhead;
  final int     estimatedWaitTimeMinutes;
  final QueueStatus status;

  const QueueEntry({
    required this.entryId,
    required this.queueNumber,
    required this.queueType,
    required this.clinicId,
    required this.clinicName,
    required this.serviceId,
    required this.serviceName,
    required this.joinedAt,
    required this.position,
    required this.totalAhead,
    required this.estimatedWaitTimeMinutes,
    required this.status,
  });

  factory QueueEntry.fromJson(Map<String, dynamic> j) {
    final clinic = j['clinic'];
    return QueueEntry(
      entryId:     j['_id']?.toString() ?? j['entryId']?.toString() ?? '',
      queueNumber: j['ticketNumber'] ?? j['queueNumber'] ?? 'Q-000',
      queueType:   (j['priority'] == true) ? QueueType.priority : QueueType.regular,
      clinicId:    clinic is Map ? (clinic['_id'] ?? '').toString() : (j['clinicId'] ?? '').toString(),
      clinicName:  clinic is Map ? (clinic['name'] ?? '') : (j['clinicName'] ?? ''),
      serviceId:   j['serviceId'] ?? '',
      serviceName: j['serviceName'] ?? '',
      joinedAt:    j['joinedAt'] != null ? DateTime.tryParse(j['joinedAt']) ?? DateTime.now() : DateTime.now(),
      position:    (j['peopleAhead'] ?? j['position'] ?? j['queuePosition'] ?? 1) as int,
      totalAhead:  (j['totalAhead'] ?? j['peopleAhead'] ?? 0) as int,
      estimatedWaitTimeMinutes: (j['estimatedWaitTime'] ?? j['estimatedWaitTimeMinutes'] ?? 15) as int,
      status:      _parseStatus(j['status']?.toString() ?? ''),
    );
  }

  static QueueStatus _parseStatus(String s) {
    switch (s.toLowerCase()) {
      case 'serving':
      case 'in_progress':
      case 'inprogress':   return QueueStatus.inProgress;
      case 'done':
      case 'completed':    return QueueStatus.completed;
      case 'missed':
      case 'no_show':
      case 'cancelled':    return QueueStatus.missed;
      default:              return QueueStatus.waiting;
    }
  }
}

class QueueJoinResult {
  final String entryId;        // MongoDB _id from server response
  final String clinicId;
  final String clinicName;
  final String serviceId;
  final String serviceName;
  final QueueType queueType;
  final String queueNumber;
  final int position;
  final int totalAhead;
  final int estimatedWaitTimeMinutes;
  final DateTime joinedAt;

  const QueueJoinResult({
    required this.entryId,
    required this.clinicId,
    required this.clinicName,
    required this.serviceId,
    required this.serviceName,
    required this.queueType,
    required this.queueNumber,
    required this.position,
    required this.totalAhead,
    required this.estimatedWaitTimeMinutes,
    required this.joinedAt,
  });
}

// kept for compatibility
class Department {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  const Department({required this.id, required this.name, required this.description, required this.icon});
}

class ServiceItem {
  final String id;
  final String name;
  final String description;
  const ServiceItem({required this.id, required this.name, required this.description});
}
