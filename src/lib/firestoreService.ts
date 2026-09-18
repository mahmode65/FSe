import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Student, School, Preference, SystemSettings } from '../types';
import { hashCredential, maskNationalId, maskStudentCode } from './crypto';

// System Settings
export async function getSystemSettings(): Promise<SystemSettings> {
  const path = 'system_settings/global';
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'global'));
    if (!snap.exists()) {
      const defaultSettings: SystemSettings = {
        isRegistrationOpen: true,
        academicYear: '2026/2027',
        semester: 'Fall Semester',
        announcement: 'Welcome students! Please review the available training schools and submit your preference.',
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'system_settings', 'global'), defaultSettings);
      return defaultSettings;
    }
    return snap.data() as SystemSettings;
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
  const path = 'system_settings/global';
  try {
    await updateDoc(doc(db, 'system_settings', 'global'), {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Schools
export async function getSchools(): Promise<School[]> {
  const path = 'schools';
  try {
    const snap = await getDocs(collection(db, 'schools'));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as School));
  } catch (error) {
    return handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeSchools(callback: (schools: School[]) => void, onError?: (err: unknown) => void) {
  const path = 'schools';
  return onSnapshot(
    collection(db, 'schools'),
    (snap) => {
      const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as School));
      callback(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function addSchool(school: Omit<School, 'id' | 'assignedCount' | 'availableSeats'>): Promise<string> {
  const schoolId = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `schools/${schoolId}`;
  try {
    const record: School = {
      ...school,
      id: schoolId,
      assignedCount: 0,
      availableSeats: school.capacity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'schools', schoolId), record);
    return schoolId;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSchool(schoolId: string, updates: Partial<School>): Promise<void> {
  const path = `schools/${schoolId}`;
  try {
    const schoolRef = doc(db, 'schools', schoolId);
    const snap = await getDoc(schoolRef);
    if (!snap.exists()) throw new Error('School not found');
    const existing = snap.data() as School;

    const newCapacity = updates.capacity !== undefined ? updates.capacity : existing.capacity;
    const assigned = existing.assignedCount || 0;
    const available = Math.max(0, newCapacity - assigned);

    await updateDoc(schoolRef, {
      ...updates,
      availableSeats: available,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSchool(schoolId: string): Promise<void> {
  const path = `schools/${schoolId}`;
  try {
    await deleteDoc(doc(db, 'schools', schoolId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Student Lookups & Preference Management
export async function authenticateStudentByCredentials(
  nationalId: string,
  studentCode: string
): Promise<Student | null> {
  const natHash = await hashCredential(nationalId);
  const codeHash = await hashCredential(studentCode);

  const path = 'students';
  try {
    const q = query(
      collection(db, 'students'),
      where('nationalIdHash', '==', natHash),
      where('studentCodeHash', '==', codeHash)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docData = snap.docs[0];
    return { ...docData.data(), id: docData.id } as Student;
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  const path = `students/${studentId}`;
  try {
    const snap = await getDoc(doc(db, 'students', studentId));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as Student;
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeStudent(
  studentId: string,
  callback: (student: Student | null) => void,
  onError?: (err: unknown) => void
) {
  const path = `students/${studentId}`;
  return onSnapshot(
    doc(db, 'students', studentId),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
      } else {
        callback({ ...snap.data(), id: snap.id } as Student);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Custom Typed Errors for School Assignment Transaction
export class SchoolCapacityReachedError extends Error {
  code = 'CAPACITY_REACHED';
  constructor(schoolName?: string) {
    super(
      schoolName
        ? `عذراً، لقد اكتملت الطاقة الاستيعابية لمدرسة "${schoolName}" ولم تعد متاحة للتسكين. يرجى اختيار مدرسة أخرى.`
        : 'عذراً، لقد اكتملت الطاقة الاستيعابية للمدرسة المحددة بواسطة طالب آخر، ولم تعد متاحة للتسكين. يرجى اختيار مدرسة أخرى.'
    );
    this.name = 'SchoolCapacityReachedError';
  }
}

export class AlreadySubmittedError extends Error {
  code = 'ALREADY_SUBMITTED';
  constructor() {
    super('لقد قمت بالفعل بتسجيل رغبتك في التدريب الميداني مسبقاً، ولا يمكن تكرار التسجيل.');
    this.name = 'AlreadySubmittedError';
  }
}

export class RegistrationClosedError extends Error {
  code = 'REGISTRATION_CLOSED';
  constructor() {
    super('عذراً، تم إغلاق فترة تسجيل رغبات التدريب الميداني من قِبل إدارة الكلية.');
    this.name = 'RegistrationClosedError';
  }
}

/**
 * School Assignment using a Firestore transaction.
 * Strictly guarantees that assignedCount NEVER exceeds capacity.
 * 
 * 1. Read the school document.
 * 2. Verify that assignedCount < capacity.
 * 3. Verify that the student has not already submitted a preference.
 * 4. Create the student's preference.
 * 5. Update the school's assignedCount atomically.
 * 6. Update the student's assignment status.
 */
export async function assignSchoolTransaction(
  studentId: string,
  schoolId: string,
  phone: string
): Promise<{ success: boolean; schoolName: string; assignedCount: number }> {
  const path = `schools/${schoolId}`;
  try {
    return await runTransaction(db, async (transaction) => {
      // 1. Read the school document
      const schoolRef = doc(db, 'schools', schoolId);
      const schoolSnap = await transaction.get(schoolRef);
      if (!schoolSnap.exists()) {
        throw new Error('مدرسة التدريب الميداني المحددة غير موجودة في النظام.');
      }
      const school = schoolSnap.data() as School;

      // 2. Verify that assignedCount < capacity
      if (!school.isActive) {
        throw new Error(`مدرسة "${school.name}" معطلة حالياً ولا تقبل طلبات التسكين.`);
      }
      if (school.assignedCount >= school.capacity) {
        // Capacity has been reached (e.g. by another concurrent transaction)
        throw new SchoolCapacityReachedError(school.name);
      }

      // 3. Verify that the student has not already submitted a preference
      // NOTE: In Firestore transactions, ALL reads must precede ANY writes.
      const studentRef = doc(db, 'students', studentId);
      const studentSnap = await transaction.get(studentRef);
      if (!studentSnap.exists()) {
        throw new Error('لم يتم العثور على سجل الطالب في قاعدة البيانات.');
      }
      const student = studentSnap.data() as Student;

      const prefRef = doc(db, 'preferences', studentId);
      const prefSnap = await transaction.get(prefRef);

      if (
        student.submissionStatus === 'submitted' ||
        Boolean(student.assignedSchoolId) ||
        prefSnap.exists()
      ) {
        throw new AlreadySubmittedError();
      }

      // Check system settings (Read phase)
      const settingsRef = doc(db, 'system_settings', 'global');
      const settingsSnap = await transaction.get(settingsRef);
      if (settingsSnap.exists() && settingsSnap.data().isRegistrationOpen === false) {
        throw new RegistrationClosedError();
      }

      // STRICT CAPACITY GUARD: Absolute invariant that assignedCount NEVER exceeds capacity
      const nextAssignedCount = school.assignedCount + 1;
      if (nextAssignedCount > school.capacity) {
        throw new SchoolCapacityReachedError(school.name);
      }

      const newAvailableSeats = Math.max(0, school.capacity - nextAssignedCount);
      const timestamp = new Date().toISOString();

      // 4. Create the student's preference
      const prefRecord: Preference = {
        id: studentId,
        studentId,
        studentName: student.fullName,
        studentCodeMasked: student.studentCodeMasked,
        department: student.department,
        academicLevel: student.academicLevel,
        schoolId,
        schoolName: school.name,
        phone,
        status: 'submitted',
        submittedAt: timestamp,
        updatedAt: timestamp,
      };
      transaction.set(prefRef, prefRecord);

      // 5. Update the school's assignedCount atomically
      transaction.update(schoolRef, {
        assignedCount: nextAssignedCount,
        availableSeats: newAvailableSeats,
        updatedAt: timestamp,
      });

      // 6. Update the student's assignment status
      transaction.update(studentRef, {
        phone,
        assignedSchoolId: schoolId,
        assignedSchoolName: school.name,
        submissionStatus: 'submitted',
        submittedAt: timestamp,
        updatedAt: timestamp,
      });

      return {
        success: true,
        schoolName: school.name,
        assignedCount: nextAssignedCount,
      };
    });
  } catch (error) {
    if (
      error instanceof SchoolCapacityReachedError ||
      error instanceof AlreadySubmittedError ||
      error instanceof RegistrationClosedError
    ) {
      throw error;
    }
    return handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Alias for existing callers
export const submitPreferenceAtomic = assignSchoolTransaction;

// Admin Reset Preference (Atomic decrement & unlock)
export async function adminResetPreference(studentId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const studentRef = doc(db, 'students', studentId);
    const studentSnap = await transaction.get(studentRef);
    if (!studentSnap.exists()) throw new Error('Student not found');
    const student = studentSnap.data() as Student;

    if (student.assignedSchoolId) {
      const schoolRef = doc(db, 'schools', student.assignedSchoolId);
      const schoolSnap = await transaction.get(schoolRef);
      if (schoolSnap.exists()) {
        const school = schoolSnap.data() as School;
        const newAssigned = Math.max(0, school.assignedCount - 1);
        const newAvailable = Math.max(0, school.capacity - newAssigned);
        transaction.update(schoolRef, {
          assignedCount: newAssigned,
          availableSeats: newAvailable,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    transaction.update(studentRef, {
      submissionStatus: 'not_submitted',
      assignedSchoolId: null,
      assignedSchoolName: null,
      submissionResetCount: (student.submissionResetCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    });

    const prefRef = doc(db, 'preferences', studentId);
    transaction.delete(prefRef);
  });
}

// Admin Student Management
export async function getAllStudents(): Promise<Student[]> {
  const path = 'students';
  try {
    const snap = await getDocs(collection(db, 'students'));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Student));
  } catch (error) {
    return handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addStudent(studentData: {
  fullName: string;
  studentCode: string;
  nationalId: string;
  department: string;
  academicLevel: string;
  academicYear?: string;
  gpa?: number;
}): Promise<string> {
  const studentId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const natHash = await hashCredential(studentData.nationalId);
  const codeHash = await hashCredential(studentData.studentCode);
  const path = `students/${studentId}`;

  try {
    const record: Student = {
      id: studentId,
      fullName: studentData.fullName.trim(),
      studentCodeMasked: maskStudentCode(studentData.studentCode),
      studentCodeHash: codeHash,
      nationalIdHash: natHash,
      nationalIdMasked: maskNationalId(studentData.nationalId),
      department: studentData.department.trim(),
      academicLevel: studentData.academicLevel.trim(),
      academicYear: studentData.academicYear || '2026/2027',
      gpa: studentData.gpa,
      submissionStatus: 'not_submitted',
      submissionResetCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'students', studentId), record);
    return studentId;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStudent(
  studentId: string,
  updates: Partial<Student> & { newStudentCode?: string; newNationalId?: string }
): Promise<void> {
  const path = `students/${studentId}`;
  try {
    const finalUpdates: Record<string, any> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.newStudentCode && updates.newStudentCode.trim()) {
      const code = updates.newStudentCode.trim();
      finalUpdates.studentCodeHash = await hashCredential(code);
      finalUpdates.studentCodeMasked = maskStudentCode(code);
      delete finalUpdates.newStudentCode;
    }

    if (updates.newNationalId && updates.newNationalId.trim()) {
      const nat = updates.newNationalId.trim();
      finalUpdates.nationalIdHash = await hashCredential(nat);
      finalUpdates.nationalIdMasked = maskNationalId(nat);
      delete finalUpdates.newNationalId;
    }

    await updateDoc(doc(db, 'students', studentId), finalUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStudent(studentId: string): Promise<void> {
  const path = `students/${studentId}`;
  try {
    // If student was assigned to a school, decrement
    const studentSnap = await getDoc(doc(db, 'students', studentId));
    if (studentSnap.exists()) {
      const student = studentSnap.data() as Student;
      if (student.assignedSchoolId) {
        const schoolSnap = await getDoc(doc(db, 'schools', student.assignedSchoolId));
        if (schoolSnap.exists()) {
          const school = schoolSnap.data() as School;
          const newAssigned = Math.max(0, school.assignedCount - 1);
          await updateDoc(doc(db, 'schools', student.assignedSchoolId), {
            assignedCount: newAssigned,
            availableSeats: Math.max(0, school.capacity - newAssigned),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
    await deleteDoc(doc(db, 'students', studentId));
    await deleteDoc(doc(db, 'preferences', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Bulk Import for Students (Chunked writeBatch)
export async function bulkImportStudents(
  rows: Array<{
    fullName: string;
    studentCode: string;
    nationalId: string;
    department: string;
    academicLevel: string;
    academicYear?: string;
    gpa?: number;
  }>,
  onProgress?: (processed: number, total: number) => void
): Promise<number> {
  let count = 0;
  const CHUNK_SIZE = 250; // Firestore batch limit is 500

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      if (!item.fullName || !item.studentCode || !item.nationalId) continue;
      const studentId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${count}`;
      const natHash = await hashCredential(item.nationalId);
      const codeHash = await hashCredential(item.studentCode);

      const record: Student = {
        id: studentId,
        fullName: item.fullName.trim(),
        studentCodeMasked: maskStudentCode(item.studentCode),
        studentCodeHash: codeHash,
        nationalIdHash: natHash,
        nationalIdMasked: maskNationalId(item.nationalId),
        department: item.department?.trim() || 'General Education',
        academicLevel: item.academicLevel?.trim() || 'Level 4',
        academicYear: item.academicYear || '2026/2027',
        gpa: item.gpa,
        submissionStatus: 'not_submitted',
        submissionResetCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ref = doc(db, 'students', studentId);
      batch.set(ref, record);
      count++;
    }

    await batch.commit();
    if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, rows.length), rows.length);
  }

  return count;
}

// Initial Seed for Demonstration
export async function seedDemoDatabase(): Promise<void> {
  const existingSchools = await getDocs(collection(db, 'schools'));
  if (!existingSchools.empty) return;

  const sampleSchools = [
    {
      name: 'Al-Farabi Experimental Language High School',
      address: '14 University District Boulevard, North Wing',
      city: 'Capital City',
      phone: '+1 (555) 234-8901',
      contactPerson: 'Dr. Nadia Mansour',
      capacity: 25,
    },
    {
      name: 'Ibn Khaldun STEM Model Academy',
      address: '88 Education City Avenue, Tech Corridor',
      city: 'Capital City',
      phone: '+1 (555) 876-1234',
      contactPerson: 'Prof. Tariq Al-Sayed',
      capacity: 18,
    },
    {
      name: 'Cambridge Preparatory & Secondary School',
      address: '202 Embassy Road, Diplomatic Quarter',
      city: 'Capital City',
      phone: '+1 (555) 432-6789',
      contactPerson: 'Mrs. Layla Hassan',
      capacity: 30,
    },
    {
      name: 'Al-Amal Girls Secondary Demonstration School',
      address: '45 Palm Grove Gardens, Central District',
      city: 'Capital City',
      phone: '+1 (555) 901-2345',
      contactPerson: 'Dr. Fatima Zahra',
      capacity: 22,
    },
    {
      name: 'Pioneers Applied Technical Secondary Institute',
      address: '109 Industrial Zone Parkway',
      city: 'Capital City',
      phone: '+1 (555) 789-0123',
      contactPerson: 'Eng. Hisham Qasim',
      capacity: 15,
    },
  ];

  for (const s of sampleSchools) {
    await addSchool({
      ...s,
      isActive: true,
    });
  }

  // Seed sample students for quick evaluation
  const sampleStudents = [
    {
      fullName: 'Ahmed Mostafa Ibrahim',
      studentCode: '20220101',
      nationalId: '29901011234567',
      department: 'Curriculum & Methodology',
      academicLevel: '4th Year',
      gpa: 3.82,
    },
    {
      fullName: 'Mariam Khaled Abdelrahman',
      studentCode: '20220102',
      nationalId: '29902022345678',
      department: 'Educational Technology',
      academicLevel: '4th Year',
      gpa: 3.91,
    },
    {
      fullName: 'Omar Hassan Mahmoud',
      studentCode: '20220103',
      nationalId: '29903033456789',
      department: 'Mathematics Education',
      academicLevel: '4th Year',
      gpa: 3.65,
    },
    {
      fullName: 'Salma Youssef Al-Naggar',
      studentCode: '20220104',
      nationalId: '29904044567890',
      department: 'English Language Teaching',
      academicLevel: '4th Year',
      gpa: 3.78,
    },
    {
      fullName: 'Youssef Karim Al-Attar',
      studentCode: '20220105',
      nationalId: '29905055678901',
      department: 'Science & Physics Education',
      academicLevel: '4th Year',
      gpa: 3.54,
    },
  ];

  await bulkImportStudents(sampleStudents);
}
