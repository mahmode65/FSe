import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { StudentPortal } from './components/StudentPortal';
import { AdminPortal } from './components/AdminPortal';
import { FirebaseGuideModal } from './components/FirebaseGuideModal';

const AppContent: React.FC = () => {
  const { role, isLoading } = useAuth();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-stone-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-stone-500">Connecting to Firebase Services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/60 font-sans text-stone-900 antialiased flex flex-col">
      <Header onOpenGuide={() => setIsGuideOpen(true)} />

      <main className="flex-1" dir={role === 'student' || role === 'admin' ? 'rtl' : undefined}>
        {!role && <LoginScreen />}
        {role === 'student' && <StudentPortal />}
        {role === 'admin' && <AdminPortal />}
      </main>

      <footer dir={role === 'student' || role === 'admin' ? 'rtl' : 'ltr'} className="border-t border-stone-200 bg-white py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {role === 'student' || role === 'admin'
              ? 'نظام توزيع وإدارة رغبات التدريب الميداني &bull; كلية التربية'
              : 'University Field Training School Preference Allocation System'}
          </span>
          <button
            onClick={() => setIsGuideOpen(true)}
            className="text-stone-600 hover:text-stone-900 hover:underline cursor-pointer"
          >
            {role === 'student' || role === 'admin' ? 'دليل إعدادات Firebase Console' : 'Firebase Console Configuration Checklist'}
          </button>
        </div>
      </footer>

      <FirebaseGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
