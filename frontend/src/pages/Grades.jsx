import React, { useState, useEffect } from 'react';
import api from '../api';
import { Save, Plus, Trash2, Calendar, BookOpen, X, Award, FileText } from 'lucide-react';

const GRADE_COLORS = {
  5: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  4: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  3: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  2: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
};

const Grades = () => {
  const role = localStorage.getItem('role');
  const isTeacherOrAdmin = role === 'admin' || role === 'teacher';

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const [journalData, setJournalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal Grade state
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [modalData, setModalData] = useState({
    studentId: '',
    studentName: '',
    gradeId: null,
    gradeValue: 5,
    date: '',
    lessonTopic: '',
    comment: ''
  });

  const loadFilters = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects')
      ]);
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);

      if (classesRes.data.length > 0) {
        setSelectedClassId(classesRes.data[0].id);
      }
      if (subjectsRes.data.length > 0) {
        setSelectedSubjectId(subjectsRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load filters', err);
      setError('Sinflar yoki fanlarni yuklashda xatolik yuz berdi');
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  const fetchJournal = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedMonth) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/grades/class/${selectedClassId}/journal?subject_id=${selectedSubjectId}&month=${selectedMonth}`);
      setJournalData(res.data);
    } catch (err) {
      console.error('Failed to fetch journal', err);
      setError('Baholar jurnalini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournal();
  }, [selectedClassId, selectedSubjectId, selectedMonth]);

  // Days in month calculator
  const getDaysArray = () => {
    const [year, monthNum] = selectedMonth.split('-').map(Number);
    const numDays = new Date(year, monthNum, 0).getDate();
    return Array.from({ length: numDays }, (_, i) => i + 1);
  };

  const days = getDaysArray();

  // Helper to format Date string
  const formatDateString = (day) => {
    const dayStr = String(day).padStart(2, '0');
    return `${selectedMonth}-${dayStr}`;
  };

  // Open modal to add or edit grade
  const handleCellClick = (student, day) => {
    const targetDate = formatDateString(day);
    const existingGrade = student.grades.find(g => g.date === targetDate);

    if (existingGrade) {
      setModalData({
        studentId: student.student_id,
        studentName: student.student_name,
        gradeId: existingGrade.id,
        gradeValue: existingGrade.grade_value,
        date: targetDate,
        lessonTopic: existingGrade.lesson_topic || '',
        comment: existingGrade.comment || ''
      });
    } else {
      setModalData({
        studentId: student.student_id,
        studentName: student.student_name,
        gradeId: null,
        gradeValue: 5,
        date: targetDate,
        lessonTopic: '',
        comment: ''
      });
    }
    setShowGradeModal(true);
  };

  // Save grade
  const handleSaveGrade = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        student_id: modalData.studentId,
        subject_id: parseInt(selectedSubjectId),
        grade_value: modalData.gradeValue,
        date: modalData.date,
        lesson_topic: modalData.lessonTopic || null,
        comment: modalData.comment || null
      };

      if (modalData.gradeId) {
        // Edit existing grade
        await api.put(`/grades/${modalData.gradeId}`, payload);
      } else {
        // Add new grade
        await api.post('/grades/', payload);
      }

      setShowGradeModal(false);
      fetchJournal();
    } catch (err) {
      console.error('Failed to save grade', err);
      alert('Bahoni saqlashda xatolik yuz berdi');
    }
  };

  // Delete grade
  const handleDeleteGrade = async () => {
    if (!modalData.gradeId) return;
    if (!window.confirm('Haqiqatan ham ushbu bahoni o‘chirmoqchimisiz?')) return;
    try {
      await api.delete(`/grades/${modalData.gradeId}`);
      setShowGradeModal(false);
      fetchJournal();
    } catch (err) {
      console.error('Failed to delete grade', err);
      alert('Bahoni o\'chirishda xatolik yuz berdi');
    }
  };

  if (!isTeacherOrAdmin) {
    return (
      <div className="bg-red-50 text-red-800 p-6 rounded-xl border border-red-100">
        Ruxsat berilmagan. Ushbu sahifa faqat o'qituvchilar va adminlar uchun.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Baholar jurnali</h1>
        <p className="text-sm text-gray-500 mt-1">Sinf o'quvchilarining fanlar bo'yicha kundalik baholari</p>
      </div>

      {/* Filter panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sinf</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.grade}-sinf)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Fan</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Oy</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Grade Book Grid Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3 border-b sticky left-0 bg-gray-50 border-r z-10 w-64 min-w-[200px]">
                    O'quvchi F.I.Sh.
                  </th>
                  {days.map(day => {
                    const isSunday = new Date(
                      parseInt(selectedMonth.split('-')[0]),
                      parseInt(selectedMonth.split('-')[1]) - 1,
                      day
                    ).getDay() === 0;

                    return (
                      <th
                        key={day}
                        className={`px-2 py-3 text-center border-b border-r text-[10px] min-w-[36px] ${isSunday ? 'bg-red-50 text-red-600 font-bold' : ''}`}
                      >
                        {day}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {journalData.length === 0 ? (
                  <tr>
                    <td colSpan={days.length + 1} className="text-center py-8 text-gray-400 text-sm">
                      Sinfda o'quvchilar mavjud emas.
                    </td>
                  </tr>
                ) : (
                  journalData.map(student => (
                    <tr key={student.student_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-white border-r font-medium text-gray-900 text-sm hover:bg-gray-50 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        <div>
                          <div className="truncate w-48 font-bold text-gray-900">{student.student_name}</div>
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{student.student_code}</span>
                        </div>
                      </td>

                      {days.map(day => {
                        const targetDate = formatDateString(day);
                        const isSunday = new Date(
                          parseInt(selectedMonth.split('-')[0]),
                          parseInt(selectedMonth.split('-')[1]) - 1,
                          day
                        ).getDay() === 0;

                        const gradeObj = student.grades.find(g => g.date === targetDate);
                        
                        return (
                          <td
                            key={day}
                            onClick={() => handleCellClick(student, day)}
                            className={`p-1 text-center border-r border-b cursor-pointer transition-colors relative group min-w-[36px] ${isSunday ? 'bg-red-50/30' : 'hover:bg-indigo-50/50'}`}
                          >
                            {gradeObj ? (
                              <div
                                title={`${gradeObj.lesson_topic ? `Mavzu: ${gradeObj.lesson_topic}\n` : ''}${gradeObj.comment ? `Izoh: ${gradeObj.comment}` : ''}`}
                                className={`w-8 h-8 mx-auto flex items-center justify-center font-bold rounded-lg border text-sm transition-all ${GRADE_COLORS[gradeObj.grade_value]}`}
                              >
                                {gradeObj.grade_value}
                              </div>
                            ) : (
                              <div className="w-8 h-8 mx-auto flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-4 h-4 text-indigo-400" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grade entry Modal */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden transform transition-all">
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Award className="w-5 h-5 text-indigo-600" />
                Baholash oynasi
              </h3>
              <button onClick={() => setShowGradeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase block">O'quvchi</span>
                <span className="font-bold text-gray-900 text-lg">{modalData.studentName}</span>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase block">Sana</span>
                <span className="font-medium text-gray-800 text-sm flex items-center gap-1 mt-0.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {modalData.date}
                </span>
              </div>

              {/* Grade values selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Baho</label>
                <div className="grid grid-cols-4 gap-3">
                  {[5, 4, 3, 2].map(val => {
                    const colorStyles = {
                      5: 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100',
                      4: 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100',
                      3: 'border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100',
                      2: 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                    };
                    const selectedStyles = {
                      5: 'bg-green-600 border-green-600 text-white hover:bg-green-700 shadow-sm ring-2 ring-green-300',
                      4: 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-sm ring-2 ring-blue-300',
                      3: 'bg-yellow-600 border-yellow-600 text-white hover:bg-yellow-700 shadow-sm ring-2 ring-yellow-300',
                      2: 'bg-red-600 border-red-600 text-white hover:bg-red-700 shadow-sm ring-2 ring-red-300'
                    };
                    
                    const isSelected = modalData.gradeValue === val;

                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setModalData({...modalData, gradeValue: val})}
                        className={`py-3 border-2 font-bold text-lg rounded-xl text-center transition-all ${isSelected ? selectedStyles[val] : colorStyles[val]}`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Mavzu</label>
                <input
                  type="text"
                  placeholder="Dars mavzusini kiriting (ixtiyoriy)"
                  value={modalData.lessonTopic}
                  onChange={(e) => setModalData({...modalData, lessonTopic: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Izoh (Ota-ona uchun)</label>
                <textarea
                  placeholder="Baho uchun izoh (ixtiyoriy)"
                  value={modalData.comment}
                  onChange={(e) => setModalData({...modalData, comment: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-6">
                <div>
                  {modalData.gradeId && (
                    <button
                      type="button"
                      onClick={handleDeleteGrade}
                      className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Bahoni o'chirish
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGradeModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm flex items-center gap-1"
                  >
                    <Save className="w-4 h-4" />
                    Saqlash
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Grades;
