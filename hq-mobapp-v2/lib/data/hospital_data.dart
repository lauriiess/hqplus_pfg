import 'package:flutter/material.dart';
import '../models/queue_models.dart';

final List<Department> departments = const [
  Department(
    id: 'gen',
    name: 'General Medicine',
    description: 'General health consultations and routine check-ups',
    icon: Icons.medical_information_outlined,
  ),
  Department(
    id: 'peds',
    name: 'Pediatrics',
    description: 'Specialized care for infants, children, and adolescents',
    icon: Icons.child_care_outlined,
  ),
  Department(
    id: 'ob',
    name: 'OB-GYN',
    description: 'Obstetrics and gynecology services',
    icon: Icons.favorite_border,
  ),
  Department(
    id: 'ortho',
    name: 'Orthopedics',
    description: 'Bone, joint, and musculoskeletal care',
    icon: Icons.accessibility_new_outlined,
  ),
  Department(
    id: 'cardio',
    name: 'Cardiology',
    description: 'Heart and cardiovascular health',
    icon: Icons.monitor_heart_outlined,
  ),
  Department(
    id: 'neuro',
    name: 'Neurology',
    description: 'Brain and nervous system disorders',
    icon: Icons.psychology_outlined,
  ),
  Department(
    id: 'lab',
    name: 'Laboratory',
    description: 'Diagnostic testing and analysis',
    icon: Icons.science_outlined,
  ),
  Department(
    id: 'radio',
    name: 'Radiology / Imaging',
    description: 'X-ray, CT, MRI, and ultrasound services',
    icon: Icons.document_scanner_outlined,
  ),
];

final List<Doctor> doctors = const [
  Doctor(
      id: 'd2',
      departmentId: 'gen',
      name: 'Dr. Miguel Santos',
      specialization: 'General Medicine'),
  Doctor(
      id: 'd4',
      departmentId: 'gen',
      name: 'Dr. Liza Navarro',
      specialization: 'General Medicine'),
  Doctor(
      id: 'd5',
      departmentId: 'gen',
      name: 'Dr. Paolo Villanueva',
      specialization: 'General Medicine'),
  Doctor(
      id: 'd3',
      departmentId: 'peds',
      name: 'Dr. Carla Dizon',
      specialization: 'Pediatrics'),
  Doctor(
      id: 'd6',
      departmentId: 'peds',
      name: 'Dr. Jasmine Lim',
      specialization: 'Pediatrics'),
  Doctor(
      id: 'd1',
      departmentId: 'ob',
      name: 'Dr. Anna Reyes',
      specialization: 'OB-GYN'),
  Doctor(
      id: 'd7',
      departmentId: 'ob',
      name: 'Dr. Sofia Bautista',
      specialization: 'OB-GYN'),
  Doctor(
      id: 'd8',
      departmentId: 'ortho',
      name: 'Dr. Ramon Cruz',
      specialization: 'Orthopedics'),
  Doctor(
      id: 'd9',
      departmentId: 'ortho',
      name: 'Dr. Bianca Flores',
      specialization: 'Orthopedics'),
  Doctor(
      id: 'd10',
      departmentId: 'cardio',
      name: 'Dr. Adrian Tan',
      specialization: 'Cardiology'),
  Doctor(
      id: 'd11',
      departmentId: 'cardio',
      name: 'Dr. Nina Garcia',
      specialization: 'Cardiology'),
  Doctor(
      id: 'd12',
      departmentId: 'neuro',
      name: 'Dr. Vincent Lee',
      specialization: 'Neurology'),
  Doctor(
      id: 'd13',
      departmentId: 'neuro',
      name: 'Dr. Mara Castillo',
      specialization: 'Neurology'),
  Doctor(
      id: 'd14',
      departmentId: 'lab',
      name: 'Dr. Eric Mendoza',
      specialization: 'Pathology / Laboratory Medicine'),
  Doctor(
      id: 'd15',
      departmentId: 'radio',
      name: 'Dr. Hazel Ramos',
      specialization: 'Radiology / Imaging'),
  Doctor(
      id: 'd16',
      departmentId: 'radio',
      name: 'Dr. Thomas Aquino',
      specialization: 'Radiology / Imaging'),
];

/// (You can add more per department later.)
final List<ServiceItem> services = const [
  // Laboratory
  ServiceItem(
      id: 'lab_blood',
      departmentId: 'lab',
      name: 'Blood Test',
      description: 'Laboratory tests and diagnostic procedures'),
  ServiceItem(
      id: 'lab_urine',
      departmentId: 'lab',
      name: 'Urinalysis',
      description: 'Laboratory tests and diagnostic procedures'),
  ServiceItem(
      id: 'lab_cbc',
      departmentId: 'lab',
      name: 'CBC',
      description: 'Laboratory tests and diagnostic procedures'),

  // Radiology/Imaging (your screenshot list)
  ServiceItem(
      id: 'rad_xray',
      departmentId: 'radio',
      name: 'X-Ray',
      description: 'Tests & Diagnostics'),
  ServiceItem(
      id: 'rad_ultra',
      departmentId: 'radio',
      name: 'Ultrasound',
      description: 'Tests & Diagnostics'),
  ServiceItem(
      id: 'rad_ct',
      departmentId: 'radio',
      name: 'CT Scan',
      description: 'Tests & Diagnostics'),
  ServiceItem(
      id: 'rad_mri',
      departmentId: 'radio',
      name: 'MRI',
      description: 'Tests & Diagnostics'),

  // Cardiology examples
  ServiceItem(
      id: 'cardio_consult',
      departmentId: 'cardio',
      name: 'Cardio Consultation',
      description: 'Consultation with cardiologist'),
];
