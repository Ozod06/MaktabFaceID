import React, { useState, useEffect } from 'react';
import api from '../api';
import { Award, BookOpen, Calendar, User, MessageSquare, Clock, ArrowUpRight } from 'lucide-react';

const GRADE_BADGES = {
  5: 'bg-green-500 text-white shadow-green-100',
  4: 'bg-blue-500 text-white shadow-blue-100',
  3: 'bg-yellow-500 text-white shadow-yellow-100',
  2: 'bg-red-500 text-white shadow-red-100'
};

const GRADE_TEXT_COLORS = {
  5: 'text-green-600',
  4: 'text-blue-600',
  3: 'text-yellow-600',
  2: 'text-red-600'
};

const GRADE_BG_COLORS = {
  5: 'bg-green-50 text-green-700 border-green-200',
  4: 'bg-blue-50 text-blue-700 border-blue-200',
  3: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  2: 'bg-red-50 text-red-700 border-red-200'
};

const StudentGrades = () => {
  const loggedInUsername = localStorage.getItem('username');
  
  const [studentInfo, setStudentInfo] = useState(null);
  const [subjectSummary, setSubjectSummary] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStudentData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch current student by student_code
      const studentsRes = await api.get('/students');
      const student = studentsRes.data.find(s => s.student_code === loggedInUsername);
      
      if (!student) {
        setError('O\'quvchi ma\'lumotlari topilmadi');
        setLoading(false);
        return;
      }
      setStudentInfo(student);

      // 2. Fetch subject summary and all grades
      const [summaryRes, gradesRes] = await Promise.all([
        api.get(`/grades/student/${student.id}/summary`),
        api.get(`/grades/?student_id=${student.id}`)
      ]);

      setSubjectSummary(summaryRes.data);
      setAllGrades(gradesRes.data);
    } catch (err) {
      console.error('Error loading student grades', err);
      setError('Baholarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  // Calculate GPA (Average of averages of subjects with grades)
  const calculateGPA = () => {
    const subjectsWithGrades = subjectSummary.filter(s => s.count > 0);
    if (subjectsWithGrades.length === 0) return 0;
    const sum = subjectsWithGrades.reduce((acc, curr) => acc + curr.average, 0);
    return (sum / subjectsWithGrades.length).toFixed(2);
  };

  const gpa = calculateGPA();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Profile Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">O'quvchi profili</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{studentInfo?.full_name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span>Kod: <strong className="text-gray-700 uppercase">{studentInfo?.student_code}</strong></span>
            <span className="h-3 w-px bg-gray-200"></span>
            <span>Sinf: <strong className="text-gray-700">{studentInfo?.student_class?.name || 'Kiritilmagan'}</strong></span>
          </div>
        </div>

        {/* Mini stats cards */}
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center min-w-[100px]">
            <span className="text-xs text-indigo-700 font-medium block">O'rtacha baho</span>
            <span className="text-3xl font-extrabold text-indigo-900 mt-1 block">{gpa}</span>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center min-w-[100px]">
            <span className="text-xs text-gray-500 font-medium block">Baholar soni</span>
            <span className="text-3xl font-extrabold text-gray-800 mt-1 block">{allGrades.length} ta</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Subjects Summary */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-gray-950 flex items-center gap-1.5">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Fanlar bo'yicha o'rtacha baho
          </h2>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
            {subjectSummary.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">Fanlar kiritilmagan.</p>
            ) : (
              subjectSummary.map(sub => {
                let badgeColor = 'bg-gray-100 text-gray-600';
                if (sub.average >= 4.5) badgeColor = 'bg-green-50 text-green-700 border-green-100';
                else if (sub.average >= 3.5) badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                else if (sub.average >= 2.5) badgeColor = 'bg-yellow-50 text-yellow-700 border-yellow-100';
                else if (sub.average > 0) badgeColor = 'bg-red-50 text-red-700 border-red-100';

                return (
                  <div key={sub.subject_id} className="flex items-center justify-between p-3 border border-gray-50 rounded-xl">
                    <div>
                      <h4 className="font-bold text-gray-950 text-sm">{sub.subject_name}</h4>
                      <span className="text-[10px] text-gray-400 block">{sub.count} ta baho</span>
                    </div>
                    {sub.count > 0 ? (
                      <span className={`text-sm font-bold px-2.5 py-1 border rounded-lg ${badgeColor}`}>
                        {sub.average.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-lg">Baho yo'q</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Grades Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-950 flex items-center gap-1.5">
            <Award className="w-5 h-5 text-indigo-600" />
            Kundalik baholar tarixi
          </h2>

          <div className="space-y-4">
            {allGrades.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center text-gray-400">
                <Award className="w-12 h-12 stroke-1 text-gray-300 mx-auto mb-3" />
                <p className="text-sm">Baholar tarixi bo'sh. Hozircha hech qanday baho qo'yilmagan.</p>
              </div>
            ) : (
              allGrades.map(grade => (
                <div
                  key={grade.id}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4"
                >
                  {/* Grade Badge */}
                  <div className={`w-12 h-12 shrink-0 flex items-center justify-center font-extrabold text-xl rounded-2xl border-2 shadow-sm ${GRADE_BG_COLORS[grade.grade_value]}`}>
                    {grade.grade_value}
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3 className="font-bold text-gray-950 text-base">{grade.subject_name}</h3>
                      <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {grade.date}
                      </span>
                    </div>

                    {grade.lesson_topic && (
                      <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex items-start gap-1.5">
                        <BookOpen className="w-4.5 h-4.5 text-gray-400 shrink-0 mt-0.5" />
                        <span><strong>Mavzu:</strong> {grade.lesson_topic}</span>
                      </p>
                    )}

                    {grade.comment && (
                      <p className="text-sm text-indigo-700 bg-indigo-50/50 border border-indigo-100/50 rounded-xl px-3 py-2 flex items-start gap-1.5">
                        <MessageSquare className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span><strong>Izoh:</strong> {grade.comment}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Baholadi: <strong>{grade.teacher_name}</strong></span>
                      <span className="h-2 w-px bg-gray-200 mx-1.5"></span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(grade.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentGrades;
