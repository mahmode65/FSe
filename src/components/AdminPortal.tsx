import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Student, School, SystemSettings } from '../types';
import {
  subscribeSchools,
  getAllStudents,
  getSystemSettings,
  updateSystemSettings,
  addSchool,
  updateSchool,
  deleteSchool,
  addStudent,
  updateStudent,
  deleteStudent,
  adminResetPreference,
  bulkImportStudents,
} from '../lib/firestoreService';
import * as XLSX from 'xlsx';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  Phone,
  Power,
  FileText,
  UploadCloud,
  AlertTriangle,
  ChevronDown,
  UserCheck,
} from 'lucide-react';

type AdminTab = 'dashboard' | 'students' | 'schools' | 'assignments' | 'reports';

export const AdminPortal: React.FC = () => {
  const { currentAdmin } = useAuth();

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Core Data State
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Status Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // --- Students Tab State ---
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDeptFilter, setStudentDeptFilter] = useState('ALL');
  const [studentLevelFilter, setStudentLevelFilter] = useState('ALL');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ALL' | 'submitted' | 'not_submitted'>('ALL');

  // --- Assignments Tab State ---
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentSchoolFilter, setAssignmentSchoolFilter] = useState('ALL');
  const [assignmentDeptFilter, setAssignmentDeptFilter] = useState('ALL');
  const [assignmentYearFilter, setAssignmentYearFilter] = useState('ALL');

  // --- Schools Tab State ---
  const [schoolFilterMode, setSchoolFilterMode] = useState<'ALL' | 'available' | 'full' | 'inactive'>('ALL');

  // --- Modals State ---
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [resetConfirmStudent, setResetConfirmStudent] = useState<Student | null>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);
  const [deleteConfirmSchool, setDeleteConfirmSchool] = useState<School | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // --- School Form Fields ---
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [schoolCity, setSchoolCity] = useState('محافظة العاصمة');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolCapacity, setSchoolCapacity] = useState<number>(20);
  const [schoolIsActive, setSchoolIsActive] = useState(true);

  // --- Student Add/Edit Form Fields ---
  const [stdFullName, setStdFullName] = useState('');
  const [stdCode, setStdCode] = useState('');
  const [stdNationalId, setStdNationalId] = useState('');
  const [stdDepartment, setStdDepartment] = useState('تكنولوجيا التعليم');
  const [stdLevel, setStdLevel] = useState('الفرقة الرابعة');
  const [stdAcademicYear, setStdAcademicYear] = useState('2026/2027');
  const [stdGpa, setStdGpa] = useState('3.50');
  const [stdPhone, setStdPhone] = useState('');

  // --- Bulk Import State ---
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // --- Reports Selection State ---
  const [selectedReportSchoolId, setSelectedReportSchoolId] = useState<string>('');

  // Initial Data & Real-time Subscription
  const refreshStudentsList = async () => {
    setIsRefreshing(true);
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
      showToast('تعذر تحميل بيانات الطلاب من قاعدة البيانات', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const unsubSchools = subscribeSchools((list) => {
      setSchools(list);
    });

    getSystemSettings()
      .then(setSettings)
      .catch((err) => console.error('Failed to get settings:', err));

    refreshStudentsList().finally(() => setIsLoading(false));

    return () => unsubSchools();
  }, []);

  // Set default report school when schools load
  useEffect(() => {
    if (schools.length > 0 && !selectedReportSchoolId) {
      setSelectedReportSchoolId(schools[0].id);
    }
  }, [schools, selectedReportSchoolId]);

  // --- Computed Metrics for Dashboard ---
  const totalStudents = students.length;
  const submittedStudents = useMemo(
    () => students.filter((s) => s.submissionStatus === 'submitted'),
    [students]
  );
  const notSubmittedStudents = useMemo(
    () => students.filter((s) => s.submissionStatus !== 'submitted'),
    [students]
  );

  const totalSubmittedCount = submittedStudents.length;
  const totalNotSubmittedCount = notSubmittedStudents.length;

  const totalSchools = schools.length;
  const fullSchools = useMemo(
    () => schools.filter((s) => s.capacity > 0 && s.assignedCount >= s.capacity),
    [schools]
  );
  const availableSchools = useMemo(
    () => schools.filter((s) => s.isActive && s.capacity > s.assignedCount),
    [schools]
  );
  const inactiveSchools = useMemo(
    () => schools.filter((s) => !s.isActive),
    [schools]
  );

  const totalCapacity = useMemo(
    () => schools.reduce((sum, s) => sum + (s.capacity || 0), 0),
    [schools]
  );
  const totalAssigned = useMemo(
    () => schools.reduce((sum, s) => sum + (s.assignedCount || 0), 0),
    [schools]
  );
  const totalRemainingSeats = Math.max(0, totalCapacity - totalAssigned);
  const overallOccupancyRate = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;
  const studentParticipationRate = totalStudents > 0 ? Math.round((totalSubmittedCount / totalStudents) * 100) : 0;

  // --- Filter Options ---
  const departmentOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.department).filter(Boolean));
    return Array.from(set);
  }, [students]);

  const levelOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.academicLevel).filter(Boolean));
    return Array.from(set);
  }, [students]);

  const academicYearOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.academicYear).filter(Boolean));
    return Array.from(set);
  }, [students]);

  // --- Filtered Students ---
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = studentSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.studentCodeMasked.toLowerCase().includes(q) ||
        s.nationalIdMasked.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.assignedSchoolName && s.assignedSchoolName.toLowerCase().includes(q));

      const matchesDept = studentDeptFilter === 'ALL' || s.department === studentDeptFilter;
      const matchesLevel = studentLevelFilter === 'ALL' || s.academicLevel === studentLevelFilter;
      const matchesStatus = studentStatusFilter === 'ALL' || s.submissionStatus === studentStatusFilter;

      return matchesSearch && matchesDept && matchesLevel && matchesStatus;
    });
  }, [students, studentSearch, studentDeptFilter, studentLevelFilter, studentStatusFilter]);

  // --- Filtered Assignments ---
  const filteredAssignments = useMemo(() => {
    return submittedStudents.filter((s) => {
      const q = assignmentSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.studentCodeMasked.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q));

      const matchesSchool = assignmentSchoolFilter === 'ALL' || s.assignedSchoolId === assignmentSchoolFilter;
      const matchesDept = assignmentDeptFilter === 'ALL' || s.department === assignmentDeptFilter;
      const matchesYear = assignmentYearFilter === 'ALL' || s.academicYear === assignmentYearFilter || s.academicLevel === assignmentYearFilter;

      return matchesSearch && matchesSchool && matchesDept && matchesYear;
    });
  }, [submittedStudents, assignmentSearch, assignmentSchoolFilter, assignmentDeptFilter, assignmentYearFilter]);

  // --- Filtered Schools ---
  const filteredSchools = useMemo(() => {
    return schools.filter((sch) => {
      if (schoolFilterMode === 'available') return sch.isActive && sch.capacity > sch.assignedCount;
      if (schoolFilterMode === 'full') return sch.capacity > 0 && sch.assignedCount >= sch.capacity;
      if (schoolFilterMode === 'inactive') return !sch.isActive;
      return true;
    });
  }, [schools, schoolFilterMode]);

  // --- Handlers: Registration Toggle ---
  const handleToggleRegistration = async () => {
    if (!settings) return;
    const newState = !settings.isRegistrationOpen;
    try {
      await updateSystemSettings({ isRegistrationOpen: newState });
      setSettings({ ...settings, isRegistrationOpen: newState });
      showToast(
        newState ? 'تم فتح باب تسجيل رغبات الطلاب بنجاح' : 'تم إغلاق باب تسجيل الرغبات وحجب الاختيار للطلاب',
        'info'
      );
    } catch (err) {
      showToast(`تعذر تحديث حالة بوابة التسجيل: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // --- Handlers: Schools CRUD ---
  const handleOpenAddSchool = () => {
    setEditingSchool(null);
    setSchoolName('');
    setSchoolAddress('');
    setSchoolCity('محافظة العاصمة');
    setSchoolPhone('');
    setSchoolCapacity(20);
    setSchoolIsActive(true);
    setIsAddSchoolOpen(true);
  };

  const handleOpenEditSchool = (sch: School) => {
    setEditingSchool(sch);
    setSchoolName(sch.name);
    setSchoolAddress(sch.address);
    setSchoolCity(sch.city || 'محافظة العاصمة');
    setSchoolPhone(sch.phone || '');
    setSchoolCapacity(sch.capacity);
    setSchoolIsActive(sch.isActive);
    setIsAddSchoolOpen(true);
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !schoolAddress.trim()) {
      showToast('يرجى كتابة اسم المدرسة وعنوانها', 'error');
      return;
    }
    if (editingSchool && schoolCapacity < editingSchool.assignedCount) {
      showToast(`لا يمكن أن تقل السعة عن عدد الطلاب المسكنين حالياً (${editingSchool.assignedCount})`, 'error');
      return;
    }

    try {
      if (editingSchool) {
        await updateSchool(editingSchool.id, {
          name: schoolName.trim(),
          address: schoolAddress.trim(),
          city: schoolCity.trim(),
          phone: schoolPhone.trim(),
          capacity: Number(schoolCapacity),
          isActive: schoolIsActive,
        });
        showToast(`تم تحديث بيانات المدرسة "${schoolName}" بنجاح`);
      } else {
        await addSchool({
          name: schoolName.trim(),
          address: schoolAddress.trim(),
          city: schoolCity.trim(),
          phone: schoolPhone.trim(),
          capacity: Number(schoolCapacity),
          isActive: schoolIsActive,
        });
        showToast(`تمت إضافة المدرسة الجديدة "${schoolName}" بنجاح`);
      }
      setIsAddSchoolOpen(false);
      setEditingSchool(null);
    } catch (err) {
      showToast(`خطأ أثناء حفظ المدرسة: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleToggleSchoolStatus = async (sch: School) => {
    try {
      await updateSchool(sch.id, { isActive: !sch.isActive });
      showToast(
        sch.isActive
          ? `تم تعطيل استقبال الرغبات لمدرسة "${sch.name}"`
          : `تم تفعيل استقبال الرغبات لمدرسة "${sch.name}"`,
        'info'
      );
    } catch (err) {
      showToast(`تعذر تغيير حالة المدرسة: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleConfirmDeleteSchool = async () => {
    if (!deleteConfirmSchool) return;
    if (deleteConfirmSchool.assignedCount > 0) {
      showToast(
        `لا يمكن حذف المدرسة: يوجد ${deleteConfirmSchool.assignedCount} طالب مسكن بها حالياً. يرجى إعادة توزيعهم أولاً.`,
        'error'
      );
      setDeleteConfirmSchool(null);
      return;
    }
    try {
      await deleteSchool(deleteConfirmSchool.id);
      showToast(`تم حذف المدرسة "${deleteConfirmSchool.name}" نهائياً`);
      setDeleteConfirmSchool(null);
    } catch (err) {
      showToast(`فشل حذف المدرسة: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // --- Handlers: Students CRUD ---
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStdFullName('');
    setStdCode('');
    setStdNationalId('');
    setStdDepartment('تكنولوجيا التعليم');
    setStdLevel('الفرقة الرابعة');
    setStdAcademicYear('2026/2027');
    setStdGpa('3.50');
    setStdPhone('');
    setIsAddStudentOpen(true);
  };

  const handleOpenEditStudent = (std: Student) => {
    setEditingStudent(std);
    setStdFullName(std.fullName);
    setStdCode(''); // keep empty unless admin wants to change
    setStdNationalId(''); // keep empty unless admin wants to change
    setStdDepartment(std.department || 'تكنولوجيا التعليم');
    setStdLevel(std.academicLevel || 'الفرقة الرابعة');
    setStdAcademicYear(std.academicYear || '2026/2027');
    setStdGpa(std.gpa !== undefined ? String(std.gpa) : '3.50');
    setStdPhone(std.phone || '');
    setIsAddStudentOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stdFullName.trim()) {
      showToast('يرجى إدخال الاسم الرباعي للطالب', 'error');
      return;
    }

    try {
      if (editingStudent) {
        const updates: any = {
          fullName: stdFullName.trim(),
          department: stdDepartment.trim(),
          academicLevel: stdLevel.trim(),
          academicYear: stdAcademicYear.trim(),
          gpa: parseFloat(stdGpa) || 3.5,
          phone: stdPhone.trim() || null,
        };
        if (stdCode.trim()) {
          updates.newStudentCode = stdCode.trim();
        }
        if (stdNationalId.trim()) {
          updates.newNationalId = stdNationalId.trim();
        }
        await updateStudent(editingStudent.id, updates);
        showToast(`تم تعديل بيانات الطالب "${stdFullName}" بنجاح`);
      } else {
        if (!stdCode.trim() || !stdNationalId.trim()) {
          showToast('يرجى إدخال كود الطالب والرقم القومي لإضافة طالب جديد', 'error');
          return;
        }
        await addStudent({
          fullName: stdFullName.trim(),
          studentCode: stdCode.trim(),
          nationalId: stdNationalId.trim(),
          department: stdDepartment.trim(),
          academicLevel: stdLevel.trim(),
          academicYear: stdAcademicYear.trim(),
          gpa: parseFloat(stdGpa) || 3.5,
        });
        showToast(`تمت إضافة الطالب الجديد "${stdFullName}" بنجاح وتشفير بياناته`);
      }
      setIsAddStudentOpen(false);
      setEditingStudent(null);
      await refreshStudentsList();
    } catch (err) {
      showToast(`حدث خطأ أثناء حفظ بيانات الطالب: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deleteConfirmStudent) return;
    try {
      await deleteStudent(deleteConfirmStudent.id);
      showToast(`تم حذف الطالب "${deleteConfirmStudent.fullName}" وإخلاء أي مقعد مرتبط به`);
      setDeleteConfirmStudent(null);
      await refreshStudentsList();
    } catch (err) {
      showToast(`تعذر حذف الطالب: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // --- Handlers: Reset Assignment ---
  const handleConfirmResetStudent = async () => {
    if (!resetConfirmStudent) return;
    try {
      await adminResetPreference(resetConfirmStudent.id);
      showToast(`تم إلغاء تسكين الطالب "${resetConfirmStudent.fullName}" وتفريغ المقعد بالمدرسة بنجاح`);
      setResetConfirmStudent(null);
      await refreshStudentsList();
    } catch (err) {
      showToast(`فشلت عملية إلغاء التسكين: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // --- Handlers: Bulk Import ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        // Normalize columns (supports Arabic and English headers)
        const normalized = rawJson.map((row) => ({
          fullName:
            row['الاسم'] ||
            row['الاسم الرباعي'] ||
            row['اسم الطالب'] ||
            row['Full Name'] ||
            row['Name'] ||
            row['fullName'] ||
            '',
          studentCode: String(
            row['كود الطالب'] ||
            row['الكود الأكاديمي'] ||
            row['رقم القيد'] ||
            row['Student Code'] ||
            row['Code'] ||
            row['studentCode'] ||
            ''
          ),
          nationalId: String(
            row['الرقم القومي'] ||
            row['رقم الهوية'] ||
            row['National ID'] ||
            row['nationalId'] ||
            ''
          ),
          department:
            row['القسم'] ||
            row['القسم الأكاديمي'] ||
            row['التخصص'] ||
            row['Department'] ||
            'تكنولوجيا التعليم',
          academicLevel:
            row['الفرقة'] ||
            row['المستوى'] ||
            row['Academic Level'] ||
            row['Year'] ||
            'الفرقة الرابعة',
          academicYear:
            row['العام الجامعي'] ||
            row['العام الدراسي'] ||
            row['Academic Year'] ||
            '2026/2027',
          gpa: parseFloat(row['المعدل'] || row['المعدل التراكمي'] || row['GPA'] || row['gpa'] || '3.5'),
        }));

        const validRows = normalized.filter((r) => r.fullName && r.studentCode && r.nationalId);
        if (validRows.length === 0) {
          setImportError(
            'لم يتم العثور على سجلات صالحة. الأعمدة الإلزامية المطلوبة: "اسم الطالب" (أو Full Name)، "كود الطالب" (أو Student Code)، "الرقم القومي" (أو National ID).'
          );
          return;
        }

        setImportRows(validRows);
      } catch (err) {
        setImportError(`فشل قراءة الملف: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImport = async () => {
    if (importRows.length === 0) return;
    setImportError(null);
    setImportSuccessMessage(null);

    try {
      setImportProgress({ current: 0, total: importRows.length });
      const importedCount = await bulkImportStudents(importRows, (cur, tot) => {
        setImportProgress({ current: cur, total: tot });
      });

      setImportSuccessMessage(
        `تم بنجاح استيراد وتشفير ${importedCount} سجلاً من طلاب كلية التربية داخل قاعدة بيانات Firestore!`
      );
      setImportRows([]);
      setImportProgress(null);
      await refreshStudentsList();
    } catch (err) {
      setImportProgress(null);
      setImportError(`خطأ أثناء عملية الاستيراد: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'اسم الطالب': 'محمد إبراهيم علي حسن',
        'كود الطالب': '20220201',
        'الرقم القومي': '29905051234567',
        'القسم': 'تكنولوجيا التعليم',
        'الفرقة': 'الفرقة الرابعة',
        'العام الجامعي': '2026/2027',
        'المعدل التراكمي': 3.75,
      },
      {
        'اسم الطالب': 'نورهان طارق القاضي',
        'كود الطالب': '20220202',
        'الرقم القومي': '29906062345678',
        'القسم': 'تعليم الرياضيات',
        'الفرقة': 'الفرقة الرابعة',
        'العام الجامعي': '2026/2027',
        'المعدل التراكمي': 3.92,
      },
      {
        'اسم الطالب': 'كريم وليد منصور',
        'كود الطالب': '20220203',
        'الرقم القومي': '29907073456789',
        'القسم': 'اللغة الإنجليزية',
        'الفرقة': 'الفرقة الرابعة',
        'العام الجامعي': '2026/2027',
        'المعدل التراكمي': 3.6,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب_استيراد_الطلاب');
    XLSX.writeFile(workbook, 'قالب_استيراد_طلاب_التدريب_الميداني.xlsx');
  };

  // --- Helper: CSV Export with UTF-8 BOM for Arabic Excel ---
  const downloadCsvFile = (filename: string, data: Record<string, any>[]) => {
    if (!data || data.length === 0) {
      showToast('لا توجد بيانات متاحة للتصدير', 'info');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvLines = [];
    csvLines.push(headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));
    for (const row of data) {
      const line = headers.map((h) => {
        const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvLines.push(line.join(','));
    }
    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`تم تنزيل ملف "${filename}" بنجاح`);
  };

  // --- Reports & Export Handlers ---

  // 1. Export All Students (Excel & CSV)
  const handleExportStudentsExcel = () => {
    const data = filteredStudents.map((s, idx) => ({
      'م': idx + 1,
      'اسم الطالب': s.fullName,
      'كود الطالب': s.studentCodeMasked,
      'الرقم القومي (مشفر)': s.nationalIdMasked,
      'القسم الأكاديمي': s.department,
      'الفرقة / المستوى': s.academicLevel,
      'العام الجامعي': s.academicYear || '2026/2027',
      'المعدل GPA': s.gpa !== undefined ? s.gpa.toFixed(2) : '—',
      'حالة التسجيل': s.submissionStatus === 'submitted' ? 'تم تسجيل الرغبة' : 'لم يسجل بعد',
      'المدرسة المسكن بها': s.assignedSchoolName || 'غير مسكن',
      'رقم هاتف الطالب': s.phone || '—',
      'تاريخ التسجيل': s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('ar-EG') : '—',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف_الطلاب');
    XLSX.writeFile(wb, `كشف_الطلاب_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('تم تصدير كشف الطلاب بصيغة Excel بنجاح');
  };

  const handleExportStudentsCsv = () => {
    const data = filteredStudents.map((s, idx) => ({
      'م': idx + 1,
      'اسم الطالب': s.fullName,
      'كود الطالب': s.studentCodeMasked,
      'القسم': s.department,
      'الفرقة': s.academicLevel,
      'العام الجامعي': s.academicYear || '2026/2027',
      'المعدل': s.gpa !== undefined ? s.gpa.toFixed(2) : '—',
      'حالة التسجيل': s.submissionStatus === 'submitted' ? 'تم التسكين' : 'لم يسجل',
      'المدرسة': s.assignedSchoolName || 'غير مسكن',
      'الهاتف': s.phone || '—',
    }));
    downloadCsvFile(`كشف_الطلاب_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  // 2. Export All Assignments
  const handleExportAllAssignmentsExcel = () => {
    const assigned = students.filter((s) => s.submissionStatus === 'submitted');
    if (assigned.length === 0) {
      showToast('لا يوجد طلاب مسكنين حتى الآن للتصدير', 'info');
      return;
    }
    const data = assigned.map((s, idx) => ({
      'مسلسل': idx + 1,
      'اسم الطالب': s.fullName,
      'كود القيد': s.studentCodeMasked,
      'القسم الأكاديمي': s.department,
      'الفرقة الدراسية': s.academicLevel,
      'العام الجامعي': s.academicYear || '2026/2027',
      'المعدل التراكمي': s.gpa ? s.gpa.toFixed(2) : '—',
      'المدرسة المسكن بها': s.assignedSchoolName || '—',
      'رقم هاتف الطالب': s.phone || '—',
      'تاريخ ووقت الاعتماد': s.submittedAt ? new Date(s.submittedAt).toLocaleString('ar-EG') : '—',
      'مرات إعادة التعيين': s.submissionResetCount || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف_التوزيع_العام');
    XLSX.writeFile(wb, `كشف_توزيع_رغبات_التدريب_الميداني_الشامل_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('تم تصدير كشف التوزيع الشامل بنجاح');
  };

  const handleExportAllAssignmentsCsv = () => {
    const assigned = students.filter((s) => s.submissionStatus === 'submitted');
    if (assigned.length === 0) {
      showToast('لا يوجد طلاب مسكنين حتى الآن للتصدير', 'info');
      return;
    }
    const data = assigned.map((s, idx) => ({
      'مسلسل': idx + 1,
      'اسم الطالب': s.fullName,
      'كود الطالب': s.studentCodeMasked,
      'القسم': s.department,
      'الفرقة': s.academicLevel,
      'المدرسة': s.assignedSchoolName || '—',
      'رقم الهاتف': s.phone || '—',
      'تاريخ الاعتماد': s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('ar-EG') : '—',
    }));
    downloadCsvFile(`كشف_توزيع_الرغبات_الشامل_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  // 3. Export Single School Roster
  const handleExportSingleSchoolExcel = (targetSchoolId: string) => {
    const targetSchool = schools.find((s) => s.id === targetSchoolId);
    if (!targetSchool) {
      showToast('يرجى تحديد مدرسة صالحة', 'error');
      return;
    }
    const schoolStudents = students.filter((s) => s.assignedSchoolId === targetSchool.id);
    if (schoolStudents.length === 0) {
      showToast(`لا يوجد طلاب مسكنين حالياً في "${targetSchool.name}"`, 'info');
      return;
    }

    const data = schoolStudents.map((s, idx) => ({
      'م': idx + 1,
      'اسم الطالب': s.fullName,
      'كود الطالب': s.studentCodeMasked,
      'القسم الأكاديمي': s.department,
      'الفرقة / المستوى': s.academicLevel,
      'رقم هاتف الطالب': s.phone || '—',
      'تاريخ التسجيل': s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('ar-EG') : '—',
      'توقيع الطالب بالحضور': '',
      'ملاحظات المدرسة': '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    const safeName = targetSchool.name.replace(/[:\\/?*[\]]/g, '').slice(0, 28) || 'كشف_المدرسة';
    XLSX.utils.book_append_sheet(wb, ws, safeName);
    XLSX.writeFile(wb, `كشف_تدريب_${targetSchool.name.replace(/\s+/g, '_')}.xlsx`);
    showToast(`تم تصدير كشف مدرسة "${targetSchool.name}" بنجاح`);
  };

  // 4. Export Separate School Files (Workbook with a Sheet per School)
  const handleExportWorkbookPerSchool = () => {
    const wb = XLSX.utils.book_new();
    let schoolsWithStudents = 0;

    // Summary Sheet first
    const summaryData = schools.map((sch, i) => ({
      'م': i + 1,
      'اسم المدرسة': sch.name,
      'العنوان': sch.address,
      'السعة الكلية': sch.capacity,
      'المسكنين فعلياً': sch.assignedCount,
      'المقاعد الشاغرة': Math.max(0, sch.capacity - sch.assignedCount),
      'نسبة الإشغال': `${Math.round((sch.assignedCount / sch.capacity) * 100)}%`,
      'حالة المدرسة': sch.isActive ? 'نشطة' : 'معطلة',
    }));
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'الملخص_العام');

    // Individual sheet for each school
    schools.forEach((sch) => {
      const schStudents = students.filter((s) => s.assignedSchoolId === sch.id);
      const rows = schStudents.map((s, idx) => ({
        'م': idx + 1,
        'اسم الطالب': s.fullName,
        'كود الطالب': s.studentCodeMasked,
        'القسم': s.department,
        'الفرقة': s.academicLevel,
        'الهاتف': s.phone || '—',
        'تاريخ الاعتماد': s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('ar-EG') : '—',
        'توقيع الحضور': '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'تنبيه': 'لا يوجد طلاب مسكنين حتى الآن بهذه المدرسة' }]);
      const safeSheetName = sch.name.replace(/[:\\/?*[\]]/g, '').slice(0, 28) || `مدرسة_${sch.id.slice(0, 5)}`;
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
      if (schStudents.length > 0) schoolsWithStudents++;
    });

    XLSX.writeFile(wb, `كشوف_المدارس_المنفصلة_تدريب_ميداني_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast(`تم تصدير مصنف متكامل بأوراق عمل منفصلة لكافة المدارس (${schools.length} مدرسة)`);
  };

  // 5. Download Individual Excel Files Sequentially for Each School
  const handleDownloadAllSchoolsIndividualFiles = () => {
    const schoolsToExport = schools.filter((sch) => sch.assignedCount > 0);
    if (schoolsToExport.length === 0) {
      showToast('لا توجد مدارس بها طلاب مسكنين حتى الآن', 'info');
      return;
    }

    schoolsToExport.forEach((sch, index) => {
      setTimeout(() => {
        const schStudents = students.filter((s) => s.assignedSchoolId === sch.id);
        const data = schStudents.map((s, idx) => ({
          'م': idx + 1,
          'اسم الطالب': s.fullName,
          'كود الطالب': s.studentCodeMasked,
          'القسم الأكاديمي': s.department,
          'الفرقة': s.academicLevel,
          'رقم الهاتف': s.phone || '—',
          'تاريخ التسجيل': s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('ar-EG') : '—',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'كشف_المدرسة');
        XLSX.writeFile(wb, `كشف_مدرسة_${sch.name.replace(/\s+/g, '_')}.xlsx`);
      }, index * 400);
    });

    showToast(`جاري تنزيل ملفات Excel لـ ${schoolsToExport.length} مدرسة تباعاً...`, 'info');
  };

  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Status Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all transform animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
              : toastMessage.type === 'error'
              ? 'bg-red-900 text-red-50 border-red-700'
              : 'bg-stone-900 text-stone-50 border-stone-700'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
          {toastMessage.type === 'info' && <Clock className="w-5 h-5 text-amber-400 shrink-0" />}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Quick Controls */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">لوحة تحكم إدارة التدريب الميداني</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-900 text-white">
              مشرف النظام
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            كلية التربية &bull; حساب المسؤول: <span className="font-mono text-stone-800 font-semibold">{currentAdmin?.email}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Registration Gate Switch */}
          {settings && (
            <button
              onClick={handleToggleRegistration}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border ${
                settings.isRegistrationOpen
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
              }`}
              title="التحكم في إتاحة تسجيل الرغبات للطلاب"
            >
              {settings.isRegistrationOpen ? (
                <>
                  <Unlock className="w-4 h-4 text-emerald-600" />
                  <span>بوابة تسجيل الرغبات: مفتوحة</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-red-600" />
                  <span>بوابة تسجيل الرغبات: مغلقة</span>
                </>
              )}
            </button>
          )}

          {/* Quick Refresh Button */}
          <button
            onClick={refreshStudentsList}
            disabled={isRefreshing}
            className="p-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors cursor-pointer"
            title="تحديث البيانات من Firestore"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-stone-900' : ''}`} />
          </button>

          {/* Quick Excel Export All */}
          <button
            onClick={handleExportAllAssignmentsExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير كشف التوزيع الشامل</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-stone-200 gap-2 sm:gap-6 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>لوحة المؤشرات</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'students'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الطلاب ({totalStudents})</span>
        </button>

        <button
          onClick={() => setActiveTab('schools')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'schools'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>المدارس والسعات ({totalSchools})</span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'assignments'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>التسكين والتوزيع ({totalSubmittedCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>التقارير والتصدير</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. DASHBOARD TAB */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Main 6 Metric Cards Requested by User */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* 1. Total students */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
              <div className="text-xs font-bold text-stone-500 flex items-center justify-between">
                <span>إجمالي الطلاب</span>
                <Users className="w-4 h-4 text-stone-400" />
              </div>
              <div className="text-2xl font-bold text-stone-900">{totalStudents}</div>
              <div className="text-[11px] text-stone-500">مسجلين بقاعدة البيانات</div>
            </div>

            {/* 2. Students who submitted preferences */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
              <div className="text-xs font-bold text-emerald-800 flex items-center justify-between">
                <span>سجلوا رغباتهم</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700">{totalSubmittedCount}</div>
              <div className="text-[11px] text-emerald-600 font-semibold">{studentParticipationRate}% نسبة المشاركة</div>
            </div>

            {/* 3. Students who have not submitted */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
              <div className="text-xs font-bold text-amber-800 flex items-center justify-between">
                <span>لم يسجلوا بعد</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-700">{totalNotSubmittedCount}</div>
              <div className="text-[11px] text-amber-600">بانتظار تسجيل الرغبة</div>
            </div>

            {/* 4. Total schools */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
              <div className="text-xs font-bold text-stone-500 flex items-center justify-between">
                <span>إجمالي المدارس</span>
                <Building2 className="w-4 h-4 text-stone-400" />
              </div>
              <div className="text-2xl font-bold text-stone-900">{totalSchools}</div>
              <div className="text-[11px] text-stone-500">مدارس شريكة للتدريب</div>
            </div>

            {/* 5. Full schools */}
            <div className="bg-white p-5 rounded-2xl border border-red-200 bg-red-50/20 shadow-xs space-y-1">
              <div className="text-xs font-bold text-red-800 flex items-center justify-between">
                <span>مدارس مكتملة</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-700">{fullSchools.length}</div>
              <div className="text-[11px] text-red-600 font-semibold">استنفدت كامل السعة</div>
            </div>

            {/* 6. Schools with available seats */}
            <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs space-y-1">
              <div className="text-xs font-bold text-blue-800 flex items-center justify-between">
                <span>مقاعد شاغرة</span>
                <Check className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">{availableSchools.length}</div>
              <div className="text-[11px] text-blue-600">مدارس تقبل التسكين</div>
            </div>
          </div>

          {/* Overall Capacity & Occupancy Visualization Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-stone-900">مؤشر الطاقة الاستيعابية الكلية للمدارس</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  إجمالي مقاعد المدارس المعتمدة مقارنة بعدد الطلاب المسكنين فعلياً عبر النظام.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="text-emerald-700">المسكنين: {totalAssigned}</span>
                <span className="text-stone-300">|</span>
                <span className="text-stone-600">المتبقي: {totalRemainingSeats}</span>
                <span className="text-stone-300">|</span>
                <span className="text-stone-900 font-bold">السعة الكلية: {totalCapacity}</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-stone-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-stone-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    overallOccupancyRate >= 95
                      ? 'bg-red-500'
                      : overallOccupancyRate >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, overallOccupancyRate)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-stone-500 font-mono">
                <span>0% إشغال</span>
                <span className="font-bold text-stone-900 font-sans">
                  نسبة الإشغال الكلية: {overallOccupancyRate}%
                </span>
                <span>100% السعة القصوى</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('students')}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-stone-400 transition-all cursor-pointer shadow-xs space-y-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-100 group-hover:bg-stone-900 group-hover:text-white flex items-center justify-center text-stone-700 transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">إدارة سجلات الطلاب</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                البحث والتصفية، إضافة طالب جديد، تعديل البيانات، والاستيراد الجماعي عبر ملفات Excel / CSV.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('schools')}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-stone-400 transition-all cursor-pointer shadow-xs space-y-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-100 group-hover:bg-stone-900 group-hover:text-white flex items-center justify-center text-stone-700 transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">المدارس والسعات الاستيعابية</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                إضافة وتعديل المدارس الشريكة، تحديد السعة المقعدية، تفعيل أو تعطيل المدارس، ومتابعة الشواغر.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('assignments')}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-stone-400 transition-all cursor-pointer shadow-xs space-y-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-100 group-hover:bg-stone-900 group-hover:text-white flex items-center justify-center text-stone-700 transition-colors">
                <UserCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">كشوف التسكين والاعتماد</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                استعراض الطلاب المسكنين في كل مدرسة، تصفية النتائج حسب القسم والمدرسة، وإلغاء التسكين ذرياً عند الحاجة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. STUDENTS TAB */}
      {/* ======================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Controls, Filters & Action Buttons */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search Field */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="بحث بالاسم، كود الطالب، الهاتف..."
                  className="w-full pr-9 pl-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all"
                />
                {studentSearch && (
                  <button
                    onClick={() => setStudentSearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-stone-600" />
                  <span>استيراد CSV / Excel</span>
                </button>

                <button
                  onClick={handleExportStudentsExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تصدير Excel</span>
                </button>

                <button
                  onClick={handleExportStudentsCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  title="تصدير ملف CSV متوافق مع كافة الأجهزة"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير CSV</span>
                </button>

                <button
                  onClick={handleOpenAddStudent}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة طالب جديد</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
              <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                تصفية النتائج:
              </span>

              {/* Department Filter */}
              <select
                value={studentDeptFilter}
                onChange={(e) => setStudentDeptFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none"
              >
                <option value="ALL">كافة الأقسام الأكاديمية</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {/* Level Filter */}
              <select
                value={studentLevelFilter}
                onChange={(e) => setStudentLevelFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none"
              >
                <option value="ALL">كافة الفرق / المستويات</option>
                {levelOptions.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={studentStatusFilter}
                onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none"
              >
                <option value="ALL">كافة حالات التسجيل</option>
                <option value="submitted">سجل رغبته (مسكن)</option>
                <option value="not_submitted">لم يسجل بعد</option>
              </select>

              {(studentSearch || studentDeptFilter !== 'ALL' || studentLevelFilter !== 'ALL' || studentStatusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setStudentSearch('');
                    setStudentDeptFilter('ALL');
                    setStudentLevelFilter('ALL');
                    setStudentStatusFilter('ALL');
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 underline cursor-pointer"
                >
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <tr>
                    <th className="py-3.5 px-4">اسم الطالب وبياناته</th>
                    <th className="py-3.5 px-4">كود الطالب والرقم القومي</th>
                    <th className="py-3.5 px-4">القسم الأكاديمي</th>
                    <th className="py-3.5 px-4">المدرسة المسكن بها</th>
                    <th className="py-3.5 px-4">الهاتف</th>
                    <th className="py-3.5 px-4">حالة الرغبة</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-400">
                        لا توجد سجلات مطابقة للبحث الحالي.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std) => (
                      <tr key={std.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-stone-900">{std.fullName}</div>
                          <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                            {std.academicLevel} &bull; العام: {std.academicYear || '2026/2027'} &bull; المعدل:{' '}
                            {std.gpa?.toFixed(2) || '—'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-700">
                          <div className="font-semibold">{std.studentCodeMasked}</div>
                          <div className="text-[10px] text-stone-400">{std.nationalIdMasked}</div>
                        </td>
                        <td className="py-3.5 px-4 text-stone-700 max-w-[150px] truncate" title={std.department}>
                          {std.department}
                        </td>
                        <td className="py-3.5 px-4">
                          {std.assignedSchoolName ? (
                            <span className="font-bold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg">
                              {std.assignedSchoolName}
                            </span>
                          ) : (
                            <span className="text-stone-400 italic">غير مسكن</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-700">{std.phone || '—'}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              std.submissionStatus === 'submitted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {std.submissionStatus === 'submitted' ? 'تم التسكين' : 'لم يسجل'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Reset Assignment button if submitted */}
                            {std.submissionStatus === 'submitted' && (
                              <button
                                onClick={() => setResetConfirmStudent(std)}
                                className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                                title="إلغاء التسكين وتفريغ المقعد"
                              >
                                تفريغ الرغبة
                              </button>
                            )}

                            {/* Edit Student Button */}
                            <button
                              onClick={() => handleOpenEditStudent(std)}
                              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                              title="تعديل بيانات الطالب"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Student Button */}
                            <button
                              onClick={() => setDeleteConfirmStudent(std)}
                              className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف الطالب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-stone-50 border-t border-stone-200 text-xs text-stone-500 flex justify-between items-center">
              <span>
                عرض {filteredStudents.length} من إجمالي {students.length} طالب
              </span>
              <span className="font-mono">تشفير الأرقام القومية محمي بتقنية SHA-256 HMAC</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SCHOOLS TAB */}
      {/* ======================================================== */}
      {activeTab === 'schools' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-stone-900">إدارة المدارس الشريكة والسعات المقعدية</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                تحديد السعة القصوى لكل مدرسة، تفعيل أو تعطيل استقبال الطلاب، ومتابعة المقاعد الشاغرة لحظياً.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddSchool}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مدرسة جديدة</span>
              </button>
            </div>
          </div>

          {/* School Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSchoolFilterMode('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                schoolFilterMode === 'ALL'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              كافة المدارس ({schools.length})
            </button>
            <button
              onClick={() => setSchoolFilterMode('available')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                schoolFilterMode === 'available'
                  ? 'bg-blue-900 text-white'
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              بها مقاعد شاغرة ({availableSchools.length})
            </button>
            <button
              onClick={() => setSchoolFilterMode('full')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                schoolFilterMode === 'full'
                  ? 'bg-red-900 text-white'
                  : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
              }`}
            >
              مكتملة بالكامل ({fullSchools.length})
            </button>
            <button
              onClick={() => setSchoolFilterMode('inactive')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                schoolFilterMode === 'inactive'
                  ? 'bg-stone-700 text-white'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              معطلة ({inactiveSchools.length})
            </button>
          </div>

          {/* School Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchools.map((sch) => {
              const remaining = Math.max(0, sch.capacity - sch.assignedCount);
              const occupancy = sch.capacity > 0 ? Math.round((sch.assignedCount / sch.capacity) * 100) : 0;

              return (
                <div
                  key={sch.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-stone-300 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 leading-tight">{sch.name}</h4>
                        <p className="text-xs text-stone-500 mt-0.5">{sch.address}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          sch.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {sch.isActive ? 'نشطة' : 'معطلة'}
                      </span>
                    </div>

                    {sch.phone && (
                      <p className="text-[11px] text-stone-500 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-stone-400" />
                        <span>{sch.phone}</span>
                      </p>
                    )}
                  </div>

                  {/* Quota Progress & Seat Counters */}
                  <div className="space-y-1.5 pt-2 border-t border-stone-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-600 font-bold">المسكنين / السعة الكلية:</span>
                      <span className="font-bold text-stone-900">
                        {sch.assignedCount} / {sch.capacity} طالب ({occupancy}%)
                      </span>
                    </div>

                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          occupancy >= 100 ? 'bg-red-500' : occupancy >= 80 ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, occupancy)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-500">
                        المتبقي:{' '}
                        <strong className={remaining === 0 ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                          {remaining} مقعد شاغر
                        </strong>
                      </span>
                      {remaining === 0 && (
                        <span className="text-red-700 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded-md">
                          مكتملة 100%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                    <button
                      onClick={() => handleExportSingleSchoolExcel(sch.id)}
                      className="inline-flex items-center gap-1 text-stone-700 hover:text-stone-900 font-bold cursor-pointer"
                      title="تصدير كشف طلاب هذه المدرسة فقط"
                    >
                      <Download className="w-3 h-3" />
                      <span>كشف الطلاب ({sch.assignedCount})</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Deactivate / Activate Button */}
                      <button
                        onClick={() => handleToggleSchoolStatus(sch)}
                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                          sch.isActive
                            ? 'text-stone-400 hover:text-amber-700 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={sch.isActive ? 'تعطيل استقبال الرغبات' : 'تفعيل استقبال الرغبات'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEditSchool(sch)}
                        className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer"
                        title="تعديل المدرسة والسعة"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeleteConfirmSchool(sch)}
                        className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="حذف المدرسة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ASSIGNMENTS TAB */}
      {/* ======================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">سجل التسكين وتوزيع الرغبات المعتمدة</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  استعراض الطلاب الذين أكملوا تسجيل رغباتهم بنجاح مع إمكانية التصفية المتقدمة وتفريغ المقاعد.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportAllAssignmentsExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير كشف التسكين (Excel)</span>
                </button>
              </div>
            </div>

            {/* Assignments Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-stone-100">
              {/* Search by Name or Code */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  placeholder="بحث باسم الطالب أو الكود..."
                  className="w-full pr-9 pl-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              {/* Filter by School */}
              <select
                value={assignmentSchoolFilter}
                onChange={(e) => setAssignmentSchoolFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none"
              >
                <option value="ALL">كافة المدارس</option>
                {schools.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name} ({sch.assignedCount} طالب)
                  </option>
                ))}
              </select>

              {/* Filter by Department */}
              <select
                value={assignmentDeptFilter}
                onChange={(e) => setAssignmentDeptFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none"
              >
                <option value="ALL">كافة الأقسام</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {/* Filter by Academic Year / Level */}
              <select
                value={assignmentYearFilter}
                onChange={(e) => setAssignmentYearFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none"
              >
                <option value="ALL">كافة الفرق / الأعوام</option>
                {academicYearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    العام: {yr}
                  </option>
                ))}
                {levelOptions.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    الفرقة: {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <tr>
                    <th className="py-3.5 px-4">م</th>
                    <th className="py-3.5 px-4">اسم الطالب</th>
                    <th className="py-3.5 px-4">كود الطالب</th>
                    <th className="py-3.5 px-4">القسم الأكاديمي</th>
                    <th className="py-3.5 px-4">المدرسة المسكن بها</th>
                    <th className="py-3.5 px-4">رقم الهاتف</th>
                    <th className="py-3.5 px-4">تاريخ الاعتماد</th>
                    <th className="py-3.5 px-4 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-stone-400">
                        لا يوجد طلاب مسكنين مطابقين لشروط التصفية الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((std, idx) => (
                      <tr key={std.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-stone-400 font-mono">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          <div>{std.fullName}</div>
                          <div className="text-[11px] text-stone-400 font-normal">
                            {std.academicLevel} &bull; {std.academicYear || '2026/2027'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-stone-700">
                          {std.studentCodeMasked}
                        </td>
                        <td className="py-3.5 px-4 text-stone-700">{std.department}</td>
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            {std.assignedSchoolName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-700">{std.phone || '—'}</td>
                        <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px]">
                          {std.submittedAt ? new Date(std.submittedAt).toLocaleString('ar-EG') : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setResetConfirmStudent(std)}
                            className="px-3 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                            title="إلغاء التسكين وتفريغ المقعد في المدرسة"
                          >
                            إلغاء التسكين
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-stone-50 border-t border-stone-200 text-xs text-stone-500 flex justify-between items-center">
              <span>إجمالي الطلاب المسكنين المعروضين: {filteredAssignments.length} طالب</span>
              <span className="font-semibold text-emerald-700">جميع المقاعد تم حجزها وفق معاملات ذرية متزامنة</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. REPORTS TAB */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
            <h3 className="text-base font-bold text-stone-900">مركز التقارير وتصدير كشوف التدريب الميداني</h3>
            <p className="text-xs text-stone-500 mt-1">
              توليد كشوف الحضور والتوزيع الرسمية المعتمدة لمدارس التدريب الميداني بصيغتي Excel و CSV.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Report 1: Export All Assignments */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-800">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-stone-900">كشف التوزيع العام الشامل</h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  تصدير ملف شامل لجميع الطلاب المسكنين بكافة المدارس متضمناً أرقام الهواتف، الأقسام، والمعدلات التراكمية.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-stone-100">
                <button
                  onClick={handleExportAllAssignmentsExcel}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير كملف Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleExportAllAssignmentsCsv}
                  className="w-full py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير كملف CSV</span>
                </button>
              </div>
            </div>

            {/* Report 2: Export Single Selected School */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-stone-900">كشف طلاب مدرسة محددة</h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  تصدير كشف حضور معتمد لطلاب مدرسة بعينها جاهز للطباعة والتوقيع لإرساله لإدارة المدرسة.
                </p>

                {/* School Selector */}
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">اختر المدرسة:</label>
                  <select
                    value={selectedReportSchoolId}
                    onChange={(e) => setSelectedReportSchoolId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  >
                    {schools.map((sch) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.name} ({sch.assignedCount} طالب مسكن)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <button
                  onClick={() => handleExportSingleSchoolExcel(selectedReportSchoolId)}
                  disabled={!selectedReportSchoolId}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير كشف المدرسة المختارة (Excel)</span>
                </button>
              </div>
            </div>

            {/* Report 3: Export Separate School Files */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-stone-900">تصدير ملفات مستقلة لكل مدرسة</h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  تصدير مصنف Excel مجمع يحتوي على ورقة عمل منفصلة (Sheet) لكل مدرسة، أو تنزيل ملفات Excel فردية لكافة المدارس.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-stone-100">
                <button
                  onClick={handleExportWorkbookPerSchool}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>مصنف بأوراق عمل مستقلة للمدارس</span>
                </button>
                <button
                  onClick={handleDownloadAllSchoolsIndividualFiles}
                  className="w-full py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل ملفات فردية للمدارس</span>
                </button>
              </div>
            </div>
          </div>

          {/* School Capacity & Occupancy Summary Table */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">تقرير الملخص الإحصائي للمدارس ونسب الإشغال</h4>
                <p className="text-xs text-stone-500">جدول توضيحي لحالة الاستيعاب ومقاعد كل مدرسة</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-stone-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">م</th>
                    <th className="py-3 px-4">اسم المدرسة</th>
                    <th className="py-3 px-4">السعة القصوى</th>
                    <th className="py-3 px-4">الطلاب المسكنين</th>
                    <th className="py-3 px-4">المقاعد الشاغرة</th>
                    <th className="py-3 px-4">نسبة الإشغال</th>
                    <th className="py-3 px-4">حالة المدرسة</th>
                    <th className="py-3 px-4 text-center">تحميل الكشف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {schools.map((sch, i) => {
                    const remaining = Math.max(0, sch.capacity - sch.assignedCount);
                    const occ = sch.capacity > 0 ? Math.round((sch.assignedCount / sch.capacity) * 100) : 0;
                    return (
                      <tr key={sch.id} className="hover:bg-stone-50/60">
                        <td className="py-3 px-4 text-stone-400 font-mono">{i + 1}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">{sch.name}</td>
                        <td className="py-3 px-4 font-mono font-semibold">{sch.capacity}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">{sch.assignedCount}</td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-700">{remaining}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              occ >= 100
                                ? 'bg-red-100 text-red-800'
                                : occ >= 80
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {occ}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sch.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {sch.isActive ? 'نشطة' : 'معطلة'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleExportSingleSchoolExcel(sch.id)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer"
                            title="تحميل كشف المدرسة"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT SCHOOL */}
      {/* ======================================================== */}
      {isAddSchoolOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-stone-200">
              <h3 className="text-base font-bold text-stone-900">
                {editingSchool ? 'تعديل بيانات مدرسة التدريب' : 'إضافة مدرسة تدريب ميداني جديدة'}
              </h3>
              <button
                onClick={() => setIsAddSchoolOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchool} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">اسم المدرسة *</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  required
                  placeholder="مثال: مدرسة النجاح الرسمية لغات"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">العنوان والموقع الجغرافي *</label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  required
                  placeholder="مثال: 15 شارع الجمهورية، بجوار مجمع المدارس"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">السعة المقعدية القصوى *</label>
                  <input
                    type="number"
                    value={schoolCapacity}
                    onChange={(e) => setSchoolCapacity(parseInt(e.target.value) || 0)}
                    min={editingSchool ? editingSchool.assignedCount : 1}
                    required
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm font-mono"
                  />
                  {editingSchool && (
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      لا يمكن أن تقل عن المسكنين حالياً ({editingSchool.assignedCount})
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">رقم هاتف المدرسة (اختياري)</label>
                  <input
                    type="text"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                    placeholder="مثال: 0223456789"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={schoolIsActive}
                  onChange={(e) => setSchoolIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-stone-900 focus:ring-stone-900 cursor-pointer"
                />
                <label htmlFor="activeToggle" className="font-bold text-stone-700 cursor-pointer">
                  المدرسة نشطة وتستقبل رغبات الطلاب
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddSchoolOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  {editingSchool ? 'حفظ التعديلات' : 'إضافة المدرسة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT STUDENT */}
      {/* ======================================================== */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-stone-200">
              <h3 className="text-base font-bold text-stone-900">
                {editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
              </h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">الاسم الرباعي للطالب *</label>
                <input
                  type="text"
                  value={stdFullName}
                  onChange={(e) => setStdFullName(e.target.value)}
                  required
                  placeholder="مثال: يوسف أحمد محمود حسن"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    كود الطالب {editingStudent ? '(اختياري للتغيير)' : '*'}
                  </label>
                  <input
                    type="text"
                    value={stdCode}
                    onChange={(e) => setStdCode(e.target.value)}
                    required={!editingStudent}
                    placeholder={editingStudent ? editingStudent.studentCodeMasked : 'مثال: 20220999'}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    الرقم القومي (14 رقم) {editingStudent ? '(اختياري للتغيير)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={stdNationalId}
                    onChange={(e) => setStdNationalId(e.target.value)}
                    required={!editingStudent}
                    placeholder={editingStudent ? editingStudent.nationalIdMasked : '14 رقم قومي'}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">القسم الأكاديمي *</label>
                  <input
                    type="text"
                    value={stdDepartment}
                    onChange={(e) => setStdDepartment(e.target.value)}
                    required
                    placeholder="مثال: تكنولوجيا التعليم"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">الفرقة الدراسية *</label>
                  <input
                    type="text"
                    value={stdLevel}
                    onChange={(e) => setStdLevel(e.target.value)}
                    required
                    placeholder="مثال: الفرقة الرابعة"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">العام الجامعي</label>
                  <input
                    type="text"
                    value={stdAcademicYear}
                    onChange={(e) => setStdAcademicYear(e.target.value)}
                    placeholder="2026/2027"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">المعدل GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={stdGpa}
                    onChange={(e) => setStdGpa(e.target.value)}
                    placeholder="3.50"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={stdPhone}
                    onChange={(e) => setStdPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  {editingStudent ? 'حفظ التعديلات' : 'إضافة الطالب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: BULK IMPORT CSV / EXCEL */}
      {/* ======================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-stone-200">
              <div>
                <h3 className="text-base font-bold text-stone-900">استيراد كشف الطلاب مجمّعاً (CSV / Excel)</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  رفع كشوف الطلاب بدفعة واحدة تصل إلى 2,000 طالب مع التشفير الفوري الآمن للأرقام القومية.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportRows([]);
                  setImportError(null);
                  setImportSuccessMessage(null);
                }}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Prompt */}
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-700 font-semibold">هل ترغب في تنزيل النموذج المعتمد؟</span>
              <button
                onClick={downloadSampleTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 rounded-lg font-bold cursor-pointer transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل قالب Excel النموذجي</span>
              </button>
            </div>

            {importError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>{importError}</div>
              </div>
            )}

            {importSuccessMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>{importSuccessMessage}</div>
              </div>
            )}

            {/* Upload Area */}
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-8 text-center bg-stone-50/50 hover:border-stone-500 transition-colors">
              <UploadCloud className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-stone-800">
                اسحب وأفلت ملف الكشف هنا، أو اضغط للتحديد من جهازك
              </div>
              <p className="text-[11px] text-stone-500 mt-1">يدعم ملفات XLSX, XLS, CSV</p>
              <label className="mt-4 inline-block">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
                <span className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors inline-block shadow-xs">
                  اختيار ملف من الجهاز
                </span>
              </label>
            </div>

            {/* Preview of Parsed Rows */}
            {importRows.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">
                    تمت قراءة {importRows.length} سجلاً بنجاح. معاينة أول 5 سجلات:
                  </span>
                  <button
                    onClick={handleExecuteImport}
                    disabled={importProgress !== null}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {importProgress ? 'جاري الحفظ والتشفير...' : `اعتماد وإدخال ${importRows.length} طالب`}
                  </button>
                </div>

                {importProgress && (
                  <div className="space-y-1 p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <div className="flex justify-between text-xs font-semibold text-stone-700">
                      <span>جاري معالجة الدفعة وتوليد التشفير...</span>
                      <span>
                        {importProgress.current} / {importProgress.total} (
                        {Math.round((importProgress.current / importProgress.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{
                          width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-stone-50 font-bold text-stone-600">
                      <tr>
                        <th className="py-2 px-3">م</th>
                        <th className="py-2 px-3">اسم الطالب</th>
                        <th className="py-2 px-3">كود الطالب</th>
                        <th className="py-2 px-3">الرقم القومي</th>
                        <th className="py-2 px-3">القسم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {importRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-stone-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-stone-900">{row.fullName}</td>
                          <td className="py-2 px-3 font-mono">{row.studentCode}</td>
                          <td className="py-2 px-3 font-mono text-stone-500">
                            {row.nationalId ? '***********' + row.nationalId.slice(-4) : ''}
                          </td>
                          <td className="py-2 px-3">{row.department}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRM RESET ASSIGNMENT */}
      {/* ======================================================== */}
      {resetConfirmStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-stone-900">تأكيد إلغاء تسكين الطالب؟</h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              هل أنت متأكد من رغبتك في إلغاء رغبة التدريب الميداني للطالب{' '}
              <strong className="text-stone-900">{resetConfirmStudent.fullName}</strong> (كود:{' '}
              <span className="font-mono">{resetConfirmStudent.studentCodeMasked}</span>)؟
            </p>

            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="font-bold">سيؤدي هذا الإجراء ذرياً إلى:</div>
              <ul className="list-disc pr-4 space-y-0.5">
                <li>إخلاء مقعد الطالب فوراً في <strong>{resetConfirmStudent.assignedSchoolName}</strong></li>
                <li>زيادة المقاعد المتاحة الشاغرة بالمدرسة بمقدار مقعد واحد</li>
                <li>حذف قيد التسكين المعتمد وتغيير حالة الطالب إلى "لم يسجل"</li>
                <li>تمكين الطالب من إعادة الدخول واختيار مدرسة أخرى بحرية</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setResetConfirmStudent(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmResetStudent}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                تأكيد إلغاء التسكين
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRM DELETE STUDENT */}
      {/* ======================================================== */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-stone-900">حذف سجل الطالب نهائياً؟</h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              هل أنت متأكد من حذف الطالب{' '}
              <strong className="text-stone-900">{deleteConfirmStudent.fullName}</strong>؟
              {deleteConfirmStudent.assignedSchoolName && (
                <span className="block mt-1 text-red-700 font-bold">
                  تنبيه: الطالب مسكن في مدرسة "{deleteConfirmStudent.assignedSchoolName}"، وسيتم إخلاء مقعده وإعادته للشواغر.
                </span>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setDeleteConfirmStudent(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                نعم، احذف الطالب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRM DELETE SCHOOL */}
      {/* ======================================================== */}
      {deleteConfirmSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-stone-900">حذف مدرسة التدريب الميداني؟</h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              هل أنت متأكد من حذف المدرسة <strong className="text-stone-900">{deleteConfirmSchool.name}</strong>؟
            </p>

            {deleteConfirmSchool.assignedCount > 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                لا يمكن حذف هذه المدرسة لأن بها {deleteConfirmSchool.assignedCount} طالب مسكن. يجب إعادة توزيع أو تفريغ رغبات هؤلاء الطلاب أولاً.
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                هذه العملية نهائية ولا يمكن التراجع عنها.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setDeleteConfirmSchool(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleteConfirmSchool.assignedCount > 0}
                onClick={handleConfirmDeleteSchool}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
