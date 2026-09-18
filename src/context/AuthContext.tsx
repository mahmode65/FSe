import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  signInAnonymously,
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { Student, AdminProfile } from '../types';
import { authenticateStudentByCredentials, getStudentById, updateStudent } from '../lib/firestoreService';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentStudent: Student | null;
  currentAdmin: AdminProfile | null;
  role: 'student' | 'admin' | null;
  isLoading: boolean;
  loginStudent: (nationalId: string, studentCode: string) => Promise<{ success: boolean; error?: string }>;
  loginAdminGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshStudent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminProfile | null>(null);
  const [role, setRole] = useState<'student' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session
  useEffect(() => {
    const storedRole = localStorage.getItem('fts_role') as 'student' | 'admin' | null;
    const storedStudentId = localStorage.getItem('fts_student_id');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        // Check if admin
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        const isMasterAdmin = user.email === 'mahmode65@gmail.com';

        if (adminDoc.exists() || isMasterAdmin) {
          const adminData: AdminProfile = adminDoc.exists()
            ? (adminDoc.data() as AdminProfile)
            : {
                uid: user.uid,
                email: user.email || 'mahmode65@gmail.com',
                fullName: user.displayName || 'Administrator',
                role: 'superadmin',
                createdAt: new Date().toISOString(),
              };

          if (!adminDoc.exists() && isMasterAdmin) {
            await setDoc(doc(db, 'admins', user.uid), adminData);
          }

          setCurrentAdmin(adminData);
          setRole('admin');
          setIsLoading(false);
          return;
        }
      }

      // If restoring student session
      if (storedRole === 'student' && storedStudentId) {
        const student = await getStudentById(storedStudentId);
        if (student) {
          setCurrentStudent(student);
          setRole('student');
        }
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginStudent = async (
    nationalId: string,
    studentCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const student = await authenticateStudentByCredentials(nationalId, studentCode);
      if (!student) {
        setIsLoading(false);
        return {
          success: false,
          error: 'No student record matched the provided National ID and Student Code. Please check your credentials.',
        };
      }

      // Sign in anonymously to obtain a valid Firebase Auth UID if not signed in
      let uid = auth.currentUser?.uid;
      if (!auth.currentUser) {
        try {
          const cred = await signInAnonymously(auth);
          uid = cred.user.uid;
        } catch (authErr) {
          console.warn('Anonymous auth note (fallback session used):', authErr);
        }
      }

      if (uid && student.authUid !== uid) {
        try {
          await updateStudent(student.id, { authUid: uid });
        } catch {
          // Non-blocking
        }
      }

      setCurrentStudent(student);
      setRole('student');
      localStorage.setItem('fts_role', 'student');
      localStorage.setItem('fts_student_id', student.id);
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      setIsLoading(false);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Authentication failed. Please try again.',
      };
    }
  };

  const loginAdminGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      const isMasterAdmin = user.email === 'mahmode65@gmail.com';

      if (!adminDoc.exists() && !isMasterAdmin) {
        await fbSignOut(auth);
        setIsLoading(false);
        return {
          success: false,
          error: `Access Denied: The Google account (${user.email}) is not registered as an administrator.`,
        };
      }

      const adminData: AdminProfile = adminDoc.exists()
        ? (adminDoc.data() as AdminProfile)
        : {
            uid: user.uid,
            email: user.email || 'mahmode65@gmail.com',
            fullName: user.displayName || 'Administrator',
            role: 'superadmin',
            createdAt: new Date().toISOString(),
          };

      if (!adminDoc.exists() && isMasterAdmin) {
        await setDoc(doc(db, 'admins', user.uid), adminData);
      }

      setCurrentAdmin(adminData);
      setRole('admin');
      localStorage.setItem('fts_role', 'admin');
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      setIsLoading(false);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Admin Google authentication failed.',
      };
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
    setCurrentStudent(null);
    setCurrentAdmin(null);
    setRole(null);
    localStorage.removeItem('fts_role');
    localStorage.removeItem('fts_student_id');
  };

  const refreshStudent = async () => {
    if (currentStudent?.id) {
      const updated = await getStudentById(currentStudent.id);
      if (updated) setCurrentStudent(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentStudent,
        currentAdmin,
        role,
        isLoading,
        loginStudent,
        loginAdminGoogle,
        logout,
        refreshStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
