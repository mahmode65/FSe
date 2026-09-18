import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Shield, LogIn, Sparkles, AlertCircle, CheckCircle, Database, Phone, User, KeyRound } from 'lucide-react';
import { seedDemoDatabase } from '../lib/firestoreService';

export const LoginScreen: React.FC = () => {
  const { loginStudent, loginAdminGoogle } = useAuth();

  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [nationalId, setNationalId] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nationalId.trim() || !studentCode.trim()) {
      setError('يرجى إدخال كل من الرقم القومي وكود الطالب الجامعي.');
      return;
    }

    setIsSubmitting(true);
    const result = await loginStudent(nationalId, studentCode);
    setIsSubmitting(false);

    if (!result.success) {
      setError(
        result.error ||
          'بيانات الدخول غير صحيحة. يرجى التأكد من الرقم القومي وكود الطالب، أو تهيئة البيانات التجريبية بالأسفل.'
      );
    }
  };

  const handleAdminGoogle = async () => {
    setError(null);
    setIsSubmitting(true);
    const result = await loginAdminGoogle();
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || 'فشل تسجيل دخول مسؤول النظام.');
    }
  };

  const handleSeedData = async () => {
    try {
      setSeedStatus('جاري تهيئة قاعدة بيانات المدارس والطلاب التجريبيين في Firestore...');
      await seedDemoDatabase();
      setSeedStatus('تمت تهيئة قاعدة البيانات بنجاح! يمكنك الآن تسجيل الدخول بالبيانات التجريبية.');
      setNationalId('29901011234567');
      setStudentCode('20220101');
    } catch (err) {
      setSeedStatus(`فشلت التهيئة: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const fillDemoStudent = (natId: string, code: string) => {
    setNationalId(natId);
    setStudentCode(code);
    setError(null);
  };

  return (
    <div dir="rtl" className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 bg-stone-100/70">
      <div className="w-full max-w-md">
        {/* Portal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stone-900 text-white mb-3 shadow-md">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            بوابة تسجيل رغبات التدريب الميداني
          </h2>
          <p className="mt-1.5 text-xs text-stone-600 font-medium">
            كلية التربية &bull; نظام التوزيع الفوري وإدارة السعات المدرسية
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 border-b border-stone-200 bg-stone-100/80 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>دخول الطالب</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>إدارة النظام</span>
            </button>
          </div>

          <div className="p-5 sm:p-7">
            {error && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <div className="leading-relaxed font-medium">{error}</div>
              </div>
            )}

            {activeTab === 'student' ? (
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                {/* National ID */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                    <span>الرقم القومي (14 رقماً)</span>
                    <span className="text-[10px] text-stone-600 font-normal">مشفّر وآمن</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      autoComplete="off"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="أدخل الرقم القومي الخاص بك"
                      className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all font-mono placeholder:font-sans placeholder:text-stone-400"
                      required
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-stone-600">
                    ملاحظة: يتم تشفير الرقم القومي فورياً بتقنية التجزئة المشفرة ولا يتم تخزينه كنص صريح.
                  </p>
                </div>

                {/* Student Code */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1.5">
                    كود الطالب الجامعي
                  </label>
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="مثال: 20220101"
                    className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all font-mono placeholder:font-sans placeholder:text-stone-400"
                    required
                  />
                  <p className="mt-1 text-[11px] text-stone-600">
                    رقم القيد أو كود الكارنيه المسجل بشؤون الطلاب.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? (
                    <span>جاري التحقق من البيانات...</span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل الدخول وبدء اختيار المدرسة</span>
                    </>
                  )}
                </button>

                {/* Demo Quick Fills */}
                <div className="pt-4 border-t border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-stone-600">
                      بيانات طلاب تجريبية للاختبار السريع:
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemoStudent('29901011234567', '20220101')}
                      className="p-2.5 text-right bg-stone-50 hover:bg-stone-100 rounded-xl text-stone-800 border border-stone-200 transition-colors cursor-pointer"
                    >
                      <div className="font-bold text-xs">أحمد مصطفى علي</div>
                      <div className="text-stone-600 font-mono text-[10px] mt-0.5">كود: 20220101</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoStudent('29902022345678', '20220102')}
                      className="p-2.5 text-right bg-stone-50 hover:bg-stone-100 rounded-xl text-stone-800 border border-stone-200 transition-colors cursor-pointer"
                    >
                      <div className="font-bold text-xs">مريم خالد عبد الرحمن</div>
                      <div className="text-stone-600 font-mono text-[10px] mt-0.5">كود: 20220102</div>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-800 leading-relaxed">
                  <strong>دخول المشرفين ومسؤولي النظام:</strong> خاص بمشرفي كلية التربية لإدارة السعات المدرسية، إغلاق أو فتح فترات التسجيل، تصدير الكشوف وإلغاء الرغبات عند الضرورة.
                </div>

                <button
                  type="button"
                  onClick={handleAdminGoogle}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold rounded-2xl border border-stone-300 shadow-xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>تسجيل الدخول بحساب Google المعتمد</span>
                </button>

                <p className="text-[11px] text-center text-stone-600">
                  البريد الإلكتروني المعتمد للمسؤول: <code className="font-mono font-bold text-stone-800">mahmode65@gmail.com</code>
                </p>
              </div>
            )}
          </div>

          {/* Seed Demo Data Bar */}
          <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs">
            <span className="text-stone-600 font-medium flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-stone-500" />
              <span>قاعدة البيانات فارغة؟</span>
            </span>
            <button
              type="button"
              onClick={handleSeedData}
              className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 rounded-xl text-xs font-semibold border border-stone-300 transition-colors cursor-pointer"
            >
              تهيئة بيانات تجريبية
            </button>
          </div>
        </div>

        {seedStatus && (
          <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{seedStatus}</span>
          </div>
        )}
      </div>
    </div>
  );
};

