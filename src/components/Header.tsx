import React from 'react';
import { useAuth } from '../context/AuthContext';
import { School, LogOut, ShieldCheck, UserCheck, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenGuide }) => {
  const { role, currentStudent, currentAdmin, logout } = useAuth();
  const isRtl = role === 'student' || role === 'admin';

  return (
    <header dir={isRtl ? 'rtl' : 'ltr'} className="border-b border-stone-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-xs">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight leading-tight">
              {role === 'admin'
                ? 'بوابة التدريب الميداني — لوحة الإدارة'
                : role === 'student'
                ? 'بوابة التدريب الميداني — رغبات الطلاب'
                : 'بوابة التدريب الميداني'}
            </h1>
            <p className="text-[11px] sm:text-xs text-stone-500">
              {role === 'admin'
                ? 'كلية التربية &bull; إدارة المقاعد والمدارس والتقارير'
                : 'كلية التربية &bull; توزيع وتسكين رغبات المدارس'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              title="دليل إعداد Firebase"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">دليل Firebase</span>
            </button>
          )}

          {role === 'student' && currentStudent && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-xs font-bold text-stone-900">{currentStudent.fullName}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    طالب
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 font-mono">كود: {currentStudent.studentCodeMasked}</p>
              </div>
              <button
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-stone-200 min-h-[38px]"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5 rotate-180" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          )}

          {role === 'admin' && currentAdmin && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-xs font-bold text-stone-900">{currentAdmin.fullName || 'مسؤول النظام'}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <ShieldCheck className="w-3 h-3 ml-1" />
                    مشرف
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 font-mono">{currentAdmin.email}</p>
              </div>
              <button
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-stone-200 min-h-[38px]"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5 rotate-180" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          )}

          {!role && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-stone-600 bg-stone-100 border border-stone-200 rounded-full">
              <UserCheck className="w-3.5 h-3.5 text-stone-500" />
              <span>بوابة الدخول الموحدة</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

