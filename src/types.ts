export interface AdminProfile {
  uid: string;
  email: string;
  fullName: string;
  role: 'admin' | 'superadmin';
  createdAt?: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  capacity: number;
  assignedCount: number;
  availableSeats: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  fullName: string;
  studentCodeMasked: string;
  studentCodeHash: string;
  nationalIdHash: string;
  nationalIdMasked: string;
  department: string;
  academicLevel: string;
  academicYear?: string;
  gpa?: number;
  phone?: string | null;
  assignedSchoolId?: string | null;
  assignedSchoolName?: string | null;
  submissionStatus: 'not_submitted' | 'submitted';
  submittedAt?: string | null;
  submissionResetCount?: number;
  authUid?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Preference {
  id: string;
  studentId: string;
  studentName: string;
  studentCodeMasked: string;
  department: string;
  academicLevel: string;
  schoolId: string;
  schoolName: string;
  phone: string;
  status: 'submitted' | 'reset';
  submittedAt?: string;
  updatedAt?: string;
}

export interface SystemSettings {
  isRegistrationOpen: boolean;
  academicYear: string;
  semester: string;
  announcement?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type AuthMode = 'student' | 'admin';
