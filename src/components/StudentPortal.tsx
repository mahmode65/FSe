import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { School, SystemSettings } from '../types';
import {
  subscribeSchools,
  subscribeStudent,
  submitPreferenceAtomic,
  getSystemSettings,
  SchoolCapacityReachedError,
  AlreadySubmittedError,
} from '../lib/firestoreService';
import {
  GraduationCap,
  Building2,
  Phone,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Lock,
  ChevronLeft,
  ChevronRight,
  Printer,
  ShieldCheck,
  Search,
  User,
  Award,
  BookOpen,
  Calendar,
  Sparkles,
  Info,
  Check,
  FileCheck,
} from 'lucide-react';

type StudentStep = 'dashboard' | 'select_school' | 'phone' | 'confirmation' | 'success';

export const StudentPortal: React.FC = () => {
  const { currentStudent } = useAuth();
  const [student, setStudent] = useState(currentStudent);
  const [schools, setSchools] = useState<School[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Form & Wizard State
  const [currentStep, setCurrentStep] = useState<StudentStep>('dashboard');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(student?.phone || '');
  const [confirmedAccuracy, setConfirmedAccuracy] = useState<boolean>(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState<string>('');

  // Async States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successTimestamp, setSuccessTimestamp] = useState<string | null>(null);

  // Real-time synchronization of current student record
  useEffect(() => {
    if (!currentStudent?.id) return;
    const unsubStudent = subscribeStudent(currentStudent.id, (updated) => {
      if (updated) {
        setStudent(updated);
        if (updated.phone && !phoneNumber) {
          setPhoneNumber(updated.phone);
        }
        // If already submitted in database, jump to success/assigned view
        if (updated.submissionStatus === 'submitted') {
          setCurrentStep('success');
          if (updated.submittedAt) {
            setSuccessTimestamp(updated.submittedAt);
          }
        }
      }
    });

    return () => unsubStudent();
  }, [currentStudent?.id]);

  // Real-time synchronization of schools & system settings
  useEffect(() => {
    const unsubSchools = subscribeSchools((list) => {
      setSchools(list);
    });

    getSystemSettings().then(setSettings).catch(console.error);

    return () => unsubSchools();
  }, []);

  // Filter ONLY available schools:
  // "Only schools with available capacity should be selectable.
  // If a school reaches its capacity, it must disappear from the available list."
  const availableSchools = useMemo(() => {
    return schools.filter((s) => {
      const remaining = s.capacity - s.assignedCount;
      return s.isActive && remaining > 0;
    });
  }, [schools]);

  // Search filtered available schools
  const filteredAvailableSchools = useMemo(() => {
    const q = schoolSearchQuery.trim().toLowerCase();
    if (!q) return availableSchools;
    return availableSchools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q))
    );
  }, [availableSchools, schoolSearchQuery]);

  // Selected school object
  const selectedSchool = useMemo(() => {
    return schools.find((s) => s.id === selectedSchoolId) || null;
  }, [schools, selectedSchoolId]);

  const isSubmitted = student?.submissionStatus === 'submitted';

  // Handle Step 2: Next from School selection
  const handleProceedToPhone = () => {
    setSubmissionError(null);
    if (!selectedSchoolId) {
      setSubmissionError('يرجى اختيار إحدى المدارس المتاحة للمتابعة.');
      return;
    }
    setCurrentStep('phone');
  };

  // Handle Step 3: Next from Phone input
  const handleProceedToConfirmation = () => {
    setSubmissionError(null);
    const cleanPhone = phoneNumber.trim();
    // Validate phone number: minimum 8 digits, preferably Egyptian standard (01xxxxxxxxx)
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 9 || digitsOnly.length > 15) {
      setSubmissionError('يرجى إدخال رقم هاتف صحيح للتواصل (من 10 إلى 12 رقماً، مثل: 01012345678).');
      return;
    }
    setCurrentStep('confirmation');
  };

  // Handle Step 4: Final Atomic Submit
  // "The UI must never be considered the source of truth for capacity.
  // The final submission must be validated atomically by the backend/database."
  const handleFinalSubmit = async () => {
    if (!student || !selectedSchoolId) return;
    setSubmissionError(null);

    if (!confirmedAccuracy) {
      setSubmissionError('يرجى تأكيد الإقرار بصحة الاختيار والالتزام بالشروط للمتابعة.');
      return;
    }

    if (settings && !settings.isRegistrationOpen) {
      setSubmissionError('عذراً، تم إغلاق فترة تسجيل الرغبات من قِبل إدارة الكلية.');
      return;
    }

    const cleanPhone = phoneNumber.trim();

    setIsSubmitting(true);
    try {
      const result = await submitPreferenceAtomic(student.id, selectedSchoolId, cleanPhone);
      setSuccessTimestamp(new Date().toISOString());
      setCurrentStep('success');
      setIsSubmitting(false);
    } catch (err) {
      setIsSubmitting(false);
      // If the backend atomic transaction fails because capacity was reached:
      if (err instanceof SchoolCapacityReachedError) {
        setSubmissionError(err.message);
        // Deselect and return to school selection
        setSelectedSchoolId('');
        setCurrentStep('select_school');
      } else if (err instanceof AlreadySubmittedError) {
        setSubmissionError(err.message);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('capacity') ||
          msg.includes('سعة') ||
          msg.includes('متاحة') ||
          msg.includes('reached') ||
          msg.includes('maximum')
        ) {
          setSubmissionError(
            'عذراً، لقد اكتملت الطاقة الاستيعابية لهذه المدرسة بواسطة طالب آخر أثناء إتمام طلبك، ولم تعد متاحة للتسكين. يرجى اختيار مدرسة أخرى من المدارس المتاحة.'
          );
          setSelectedSchoolId('');
          setCurrentStep('select_school');
        } else {
          setSubmissionError(msg || 'حدث خطأ أثناء تسجيل الرغبة. يرجى المحاولة مرة أخرى.');
        }
      }
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  if (!student) {
    return (
      <div dir="rtl" className="p-8 text-center text-stone-500 font-sans">
        جاري تحميل بيانات الطالب الأكاديمية...
      </div>
    );
  }

  return (
    <div dir="rtl" className="max-w-xl mx-auto px-4 py-4 sm:py-8 space-y-5 font-sans">
      {/* Registration Status Notice */}
      {settings && !settings.isRegistrationOpen && !isSubmitted && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs shadow-xs">
          <Clock className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block text-sm mb-0.5">تنبيه من إدارة الكلية:</span>
            فترة تسجيل رغبات التدريب الميداني مغلقة حالياً. يمكنك استعراض بياناتك الأكاديمية ومتابعة الإعلانات الصادرة من شؤون التدريب.
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {submissionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-medium">{submissionError}</div>
        </div>
      )}

      {/* Wizard Progress Tracker (Only when not already submitted) */}
      {!isSubmitted && (
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div
              className={`flex items-center gap-1.5 ${
                currentStep === 'dashboard'
                  ? 'text-stone-900 font-bold'
                  : 'text-stone-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === 'dashboard'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                1
              </div>
              <span className="hidden sm:inline">البيانات</span>
            </div>

            <div className="w-6 sm:w-10 h-0.5 bg-stone-200" />

            <div
              className={`flex items-center gap-1.5 ${
                currentStep === 'select_school'
                  ? 'text-stone-900 font-bold'
                  : 'text-stone-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === 'select_school'
                    ? 'bg-stone-900 text-white'
                    : currentStep === 'phone' || currentStep === 'confirmation' || currentStep === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                2
              </div>
              <span className="hidden sm:inline">المدرسة</span>
            </div>

            <div className="w-6 sm:w-10 h-0.5 bg-stone-200" />

            <div
              className={`flex items-center gap-1.5 ${
                currentStep === 'phone'
                  ? 'text-stone-900 font-bold'
                  : 'text-stone-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === 'phone'
                    ? 'bg-stone-900 text-white'
                    : currentStep === 'confirmation' || currentStep === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                3
              </div>
              <span className="hidden sm:inline">الهاتف</span>
            </div>

            <div className="w-6 sm:w-10 h-0.5 bg-stone-200" />

            <div
              className={`flex items-center gap-1.5 ${
                currentStep === 'confirmation' || currentStep === 'success'
                  ? 'text-stone-900 font-bold'
                  : 'text-stone-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  currentStep === 'confirmation' || currentStep === 'success'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                4
              </div>
              <span className="hidden sm:inline">التأكيد</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: STUDENT DASHBOARD & ACADEMIC INFORMATION                          */}
      {/* ========================================================================= */}
      {currentStep === 'dashboard' && !isSubmitted && (
        <div className="space-y-5">
          {/* Welcome & Student Identity Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3.5 pb-4 border-b border-stone-100">
              <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                {student.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-stone-900 truncate">
                    {student.fullName}
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  كلية التربية &bull; العام الجامعي {student.academicYear || '2026 / 2027'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                    في انتظار تسجيل الرغبة
                  </span>
                </div>
              </div>
            </div>

            {/* Academic Information Grid */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-stone-500" />
                <span>البيانات الأكاديمية المعتمدة</span>
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                  <div className="text-[11px] text-stone-500 font-semibold">كود الطالب الجامعي</div>
                  <div className="text-sm font-bold font-mono text-stone-900">
                    {student.studentCodeMasked}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                  <div className="text-[11px] text-stone-500 font-semibold">الرقم القومي (المشفر)</div>
                  <div className="text-sm font-bold font-mono text-stone-900">
                    {student.nationalIdMasked}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1 col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-stone-500 font-semibold">القسم الأكاديمي</div>
                  <div className="text-xs font-bold text-stone-900 truncate" title={student.department}>
                    {student.department}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                  <div className="text-[11px] text-stone-500 font-semibold">الفرقة الدراسية</div>
                  <div className="text-xs font-bold text-stone-900">
                    {student.academicLevel}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                  <div className="text-[11px] text-stone-500 font-semibold">المعدل التراكمي (GPA)</div>
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>{student.gpa ? student.gpa.toFixed(2) : '3.80'} / 4.00</span>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                  <div className="text-[11px] text-stone-500 font-semibold">رقم الهاتف المسجل</div>
                  <div className="text-xs font-bold font-mono text-stone-900">
                    {student.phone || 'لم يسجل بعد'}
                  </div>
                </div>
              </div>
            </div>

            {/* Instruction Callout */}
            <div className="p-3.5 bg-stone-100/70 rounded-2xl border border-stone-200 text-xs text-stone-700 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
              <div>
                يرجى التأكد من مطابقة بياناتك الأكاديمية. عند الضغط على الزر أدناه، ستظهر لك المدارس المتاحة التي تحتوي على مقاعد شاغرة للتدريب العملي.
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => {
                setSubmissionError(null);
                setCurrentStep('select_school');
              }}
              disabled={settings ? !settings.isRegistrationOpen : false}
              className="w-full py-3.5 px-5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[46px]"
            >
              <span>المتابعة لاختيار مدرسة التدريب الميداني</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: TRAINING SCHOOL SELECTION                                          */}
      {/* ========================================================================= */}
      {currentStep === 'select_school' && !isSubmitted && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">
                  اختيار مدرسة التدريب الميداني
                </h3>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-xl border border-emerald-200">
                  {availableSchools.length} مدرسة متاحة
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                تعرض القائمة حصرياً المدارس التي بها مقاعد شاغرة. تختفي المدرسة تلقائياً بمجرد اكتمال سعتها.
              </p>
            </div>

            {/* Live Capacity Notice */}
            <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl text-[11px] text-stone-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                تحديث المقاعد المتاحة فوري ولحظي
              </span>
              <span className="text-stone-400 font-mono text-[10px]">Live Sync</span>
            </div>

            {/* School Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={schoolSearchQuery}
                onChange={(e) => setSchoolSearchQuery(e.target.value)}
                placeholder="ابحث باسم المدرسة أو العنوان..."
                className="w-full pr-10 pl-4 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all placeholder:text-stone-400"
              />
            </div>

            {/* Schools List: Only schools with available capacity */}
            {filteredAvailableSchools.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-2">
                <Building2 className="w-8 h-8 text-stone-400 mx-auto" />
                <h4 className="text-xs font-bold text-stone-800">
                  {availableSchools.length === 0
                    ? 'عذراً، اكتملت سعة جميع المدارس المتاحة حالياً!'
                    : 'لا توجد مدرسة مطابقة لبحثك'}
                </h4>
                <p className="text-[11px] text-stone-500 max-w-sm mx-auto leading-relaxed">
                  {availableSchools.length === 0
                    ? 'تم حجز كافة المقاعد في المدارس الشريكة. يرجى مراجعة إدارة التدريب الميداني بالكلية لفتح سعات إضافية.'
                    : 'يرجى تجربة كلمات بحث أخرى أو مسح حقل البحث لإظهار كافة المدارس المتاحة.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                {filteredAvailableSchools.map((school) => {
                  const remainingSeats = school.capacity - school.assignedCount;
                  const isSelected = selectedSchoolId === school.id;
                  const occupancyPercent = Math.round((school.assignedCount / school.capacity) * 100);

                  return (
                    <div
                      key={school.id}
                      onClick={() => {
                        setSelectedSchoolId(school.id);
                        setSubmissionError(null);
                      }}
                      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-stone-900 bg-stone-50/80 shadow-xs'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          {/* School Name */}
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-stone-900 bg-stone-900 text-white'
                                  : 'border-stone-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <h4 className="text-sm font-bold text-stone-900 leading-snug">
                              {school.name}
                            </h4>
                          </div>

                          {/* Address */}
                          <p className="text-xs text-stone-600 flex items-center gap-1.5 pt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate">{school.address}</span>
                          </p>
                        </div>

                        {/* Available Seats Badge */}
                        <div className="text-left shrink-0">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold ${
                              remainingSeats <= 3
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            متبقي {remainingSeats} {remainingSeats === 1 ? 'مقعد' : remainingSeats === 2 ? 'مقعدان' : 'مقاعد'}
                          </span>
                          <div className="text-[10px] text-stone-600 mt-1 font-mono text-left">
                            {school.assignedCount} / {school.capacity} ({occupancyPercent}%)
                          </div>
                        </div>
                      </div>

                      {/* Small Capacity Bar */}
                      <div className="w-full bg-stone-200 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            occupancyPercent >= 80 ? 'bg-amber-500' : 'bg-stone-900'
                          }`}
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step Navigation Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep('dashboard')}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer min-h-[44px]"
              >
                السابق: البيانات
              </button>

              <button
                type="button"
                onClick={handleProceedToPhone}
                disabled={!selectedSchoolId}
                className="flex-1 py-3 px-5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                <span>التالي: إدخال رقم الهاتف</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: PHONE NUMBER INPUT                                                */}
      {/* ========================================================================= */}
      {currentStep === 'phone' && !isSubmitted && selectedSchool && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                رقم الهاتف للتواصل
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                سيتواصل معك المشرف الأكاديمي وإدارة المدرسة عبر هذا الرقم لتنسيق جدول التدريب.
              </p>
            </div>

            {/* Selected School Reminder Banner */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-stone-500 shrink-0" />
                <span className="font-bold text-stone-900 truncate">{selectedSchool.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep('select_school')}
                className="text-[11px] font-bold text-stone-600 hover:text-stone-900 underline shrink-0"
              >
                تغيير
              </button>
            </div>

            {/* Phone Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-800">
                رقم الهاتف المحمول (نشط ومتاح للاتصال)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="01012345678"
                  className="w-full px-4 py-3 text-base bg-stone-50 border border-stone-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all font-mono placeholder:font-sans placeholder:text-stone-400 text-right"
                  required
                />
              </div>
              <p className="text-[11px] text-stone-500">
                مثال: 01012345678 أو 011xxxxxxxx أو 012xxxxxxxx
              </p>
            </div>

            {/* Guidance Box */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                تأكد من إدخال رقم الهاتف الذي تستخدمه شخصياً، حيث ستصلك عليه تنبيهات مواعيد التوجيه والزيارات الميدانية.
              </div>
            </div>

            {/* Step Navigation Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep('select_school')}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer min-h-[44px]"
              >
                السابق: المدرسة
              </button>

              <button
                type="button"
                onClick={handleProceedToConfirmation}
                disabled={!phoneNumber.trim()}
                className="flex-1 py-3 px-5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                <span>المتابعة لشاشة التأكيد والمراجعة</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: CONFIRMATION SCREEN (REVIEW BEFORE SUBMISSION)                     */}
      {/* ========================================================================= */}
      {currentStep === 'confirmation' && !isSubmitted && selectedSchool && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                مراجعة وتأكيد الرغبة النهائية
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                يرجى مراجعة كافة بيانات اختيارك بعناية قبل الإرسال النهائي واعتماد المقعد.
              </p>
            </div>

            {/* Summary Review Card */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3.5 text-xs">
              <div>
                <span className="text-[11px] font-bold text-stone-600 block mb-1">
                  المدرسة المختارة للتدريب:
                </span>
                <div className="text-base font-bold text-stone-900">
                  {selectedSchool.name}
                </div>
                <div className="text-xs text-stone-600 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{selectedSchool.address}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200">
                <div>
                  <span className="text-[11px] text-stone-600 block">المقاعد المتبقية:</span>
                  <span className="font-bold text-emerald-800 text-xs">
                    {selectedSchool.capacity - selectedSchool.assignedCount} مقاعد متاحة
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-stone-600 block">رقم هاتف التواصل:</span>
                  <span className="font-bold font-mono text-stone-900 text-xs">
                    {phoneNumber}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <span className="text-[11px] text-stone-600 block">بيانات الطالب المعتمدة:</span>
                <span className="font-bold text-stone-900">
                  {student.fullName} ({student.studentCodeMasked})
                </span>
                <div className="text-stone-600 text-[11px] mt-0.5">
                  {student.department} &bull; {student.academicLevel}
                </div>
              </div>
            </div>

            {/* Regulatory Finality Warning */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-2 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <Lock className="w-4 h-4 text-red-600 shrink-0" />
                <span>إقرار بعدم جواز التعديل لاحقاً (نهائية الاختيار)</span>
              </div>
              <p>
                بمجرد الضغط على زر الاعتماد، سيتم حجز المقعد وربطه برقمك الجامعي وقفل إمكانية التعديل. لا يمكن التراجع أو استبدال المدرسة إلا بموافقة خطية من إدارة التدريب الميداني بالكلية.
              </p>
            </div>

            {/* Checkbox Acknowledgment */}
            <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <input
                type="checkbox"
                id="accuracyAgreement"
                checked={confirmedAccuracy}
                onChange={(e) => setConfirmedAccuracy(e.target.checked)}
                className="w-5 h-5 rounded text-stone-900 focus:ring-stone-900 border-stone-300 mt-0.5 shrink-0 cursor-pointer"
              />
              <label
                htmlFor="accuracyAgreement"
                className="text-xs text-stone-800 font-medium leading-relaxed cursor-pointer"
              >
                أقر بأنني راجعت رغبتي وأوافق على شروط التوزيع والالتزام بالحضور والتدريب في المدرسة المذكورة أعلاه.
              </label>
            </div>

            {/* Step Navigation Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep('phone')}
                disabled={isSubmitting}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer min-h-[46px]"
              >
                السابق: تعديل الهاتف
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || !confirmedAccuracy}
                className="flex-1 py-3 px-5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[46px]"
              >
                {isSubmitting ? (
                  <span>جاري حجز المقعد والتحقق الذري...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>تأكيد وتسجيل الرغبة نهائياً</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: SUCCESS SCREEN & OFFICIAL VIEW-ONLY ASSIGNMENT SLIP                */}
      {/* ========================================================================= */}
      {(currentStep === 'success' || isSubmitted) && (
        <div className="space-y-5">
          {/* Success Banner */}
          <div className="bg-emerald-600 rounded-3xl p-6 text-white text-center shadow-sm space-y-2">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold">تم تأكيد رغبة التدريب الميداني بنجاح!</h2>
            <p className="text-xs text-emerald-100 max-w-sm mx-auto leading-relaxed">
              تم حجز وتأكيد مقعدك رسمياً في قاعدة البيانات وربطه برقم قيدك الجامعي.
            </p>
          </div>

          {/* Official Printable Assignment Slip */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-5 print:shadow-none print:border-none">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  إشعار التخصيص الإلكتروني الرسمي
                </span>
                <h3 className="text-base font-bold text-stone-900 mt-0.5">
                  بيانات مدرسة التدريب المعتمدة
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
                معتمد
              </span>
            </div>

            {/* School Details */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="text-[11px] font-bold text-stone-500">اسم المدرسة:</div>
              <div className="text-lg font-bold text-stone-900">
                {student.assignedSchoolName || selectedSchool?.name || 'مدرسة التدريب المعتمدة'}
              </div>
              <div className="text-xs text-stone-600 flex items-center gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>{selectedSchool?.address || 'راجع إدارة التدريب الميداني للحصول على العنوان التفصيلي'}</span>
              </div>
            </div>

            {/* Verification Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-[11px] text-stone-500 block">اسم الطالب:</span>
                <span className="font-bold text-stone-900">{student.fullName}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-[11px] text-stone-500 block">كود الطالب:</span>
                <span className="font-bold font-mono text-stone-900">{student.studentCodeMasked}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-[11px] text-stone-500 block">القسم والفرقة:</span>
                <span className="font-bold text-stone-900 truncate block">{student.department} - {student.academicLevel}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-[11px] text-stone-500 block">رقم هاتف التواصل:</span>
                <span className="font-bold font-mono text-stone-900">{student.phone || phoneNumber}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 col-span-2">
                <span className="text-[11px] text-stone-500 block">توقيت التسجيل الموثق:</span>
                <span className="font-bold font-mono text-stone-900">
                  {student.submittedAt || successTimestamp
                    ? new Date(student.submittedAt || successTimestamp!).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'مسجل ومعتمد في النظام'}
                </span>
              </div>
            </div>

            {/* Lock Policy Callout */}
            <div className="p-3.5 bg-stone-100/80 rounded-2xl border border-stone-200 text-xs text-stone-700 leading-relaxed flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
              <div>
                <strong>سياسة الحفظ والإغلاق:</strong> تم قفل طلبك وتخصيص المقعد نهائياً. لا يمكن للطلبة تعديل الرغبة. إذا كنت بحاجة إلى مساعدة أو استفسار، يرجى مراجعة مقر شؤون التدريب الميداني بكلية التربية.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handlePrintSlip}
                className="flex-1 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة أو حفظ إشعار التخصيص (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
