import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Trash2, Edit2, Calendar, Clock, User, BookOpen, X, ChevronRight } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Dushanba' },
  { value: 2, label: 'Seshanba' },
  { value: 3, label: 'Chorshanba' },
  { value: 4, label: 'Payshanba' },
  { value: 5, label: 'Juma' },
  { value: 6, label: 'Shanba' }
];

const LESSON_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

const Schedule = () => {
  const role = localStorage.getItem('role');
  const loggedInUsername = localStorage.getItem('username');
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' or 'subjects'
  const [scheduleData, setScheduleData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subjects Management State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    class_id: '',
    subject_id: '',
    teacher_id: '',
    day_of_week: 1,
    lesson_number: 1,
    start_time: '08:30',
    end_time: '09:15'
  });

  const [error, setError] = useState('');

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch classes & subjects
      const [classesRes, subjectsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects')
      ]);
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);

      if (isAdmin || isTeacher) {
        // Fetch teachers list for schedule form
        const teachersRes = await api.get('/schedule/teachers');
        setTeachers(teachersRes.data);
      }

      // 2. Identify the active class for students
      if (role !== 'admin' && role !== 'teacher') {
        const studentsRes = await api.get('/students');
        const currentStudent = studentsRes.data.find(s => s.student_code === loggedInUsername);
        if (currentStudent) {
          setSelectedClassId(currentStudent.class_id);
          fetchSchedule(currentStudent.class_id);
        } else {
          setLoading(false);
        }
      } else {
        // For admin/teacher, default to first class
        if (classesRes.data.length > 0) {
          setSelectedClassId(classesRes.data[0].id);
          fetchSchedule(classesRes.data[0].id);
        } else {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to load schedule page data', err);
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
      setLoading(false);
    }
  };

  const fetchSchedule = async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await api.get(`/schedule/?class_id=${classId}`);
      setScheduleData(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch schedule', err);
      setError('Dars jadvalini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    fetchSchedule(classId);
  };

  // Add Subject
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      const res = await api.post('/subjects/', {
        name: newSubjectName,
        code: newSubjectCode || null
      });
      setSubjects([...subjects, res.data]);
      setNewSubjectName('');
      setNewSubjectCode('');
    } catch (err) {
      console.error('Failed to add subject', err);
      alert('Fanni qo\'shishda xatolik yuz berdi');
    }
  };

  // Delete Subject
  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Haqiqatan ham ushbu fanni o‘chirmoqchimisiz?')) return;
    try {
      await api.delete(`/subjects/${subjectId}`);
      setSubjects(subjects.filter(s => s.id !== subjectId));
    } catch (err) {
      console.error('Failed to delete subject', err);
      alert('Fanni o\'chirishda xatolik yuz berdi. U dars jadvalida ishlatilayotgan bo\'lishi mumkin.');
    }
  };

  // Open Add/Edit Schedule Modal
  const openScheduleModal = (item = null) => {
    if (item) {
      setEditingSchedule(item);
      setScheduleForm({
        class_id: item.class_id,
        subject_id: item.subject_id,
        teacher_id: item.teacher_id,
        day_of_week: item.day_of_week,
        lesson_number: item.lesson_number,
        start_time: item.start_time,
        end_time: item.end_time
      });
    } else {
      setEditingSchedule(null);
      setScheduleForm({
        class_id: selectedClassId,
        subject_id: subjects[0]?.id || '',
        teacher_id: teachers[0]?.id || '',
        day_of_week: 1,
        lesson_number: 1,
        start_time: '08:30',
        end_time: '09:15'
      });
    }
    setShowScheduleModal(true);
  };

  // Save Schedule Item (Create or Update)
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await api.put(`/schedule/${editingSchedule.id}`, scheduleForm);
      } else {
        await api.post('/schedule/', scheduleForm);
      }
      setShowScheduleModal(false);
      fetchSchedule(selectedClassId);
    } catch (err) {
      console.error('Failed to save schedule', err);
      alert('Dars jadvalini saqlashda xatolik yuz berdi. Ma\'lumotlar to\'g\'riligini tekshiring.');
    }
  };

  // Delete Schedule Item
  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Haqiqatan ham ushbu darsni jadvaldan o‘chirmoqchimisiz?')) return;
    try {
      await api.delete(`/schedule/${id}`);
      fetchSchedule(selectedClassId);
    } catch (err) {
      console.error('Failed to delete schedule item', err);
      alert('Darsni o\'chirishda xatolik yuz berdi');
    }
  };

  // Group schedule by day_of_week
  const getScheduleForDay = (dayVal) => {
    return scheduleData
      .filter(item => item.day_of_week === dayVal)
      .sort((a, b) => a.lesson_number - b.lesson_number);
  };

  return (
    <div className="space-y-6">
      {/* Title & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dars jadvali</h1>
          <p className="text-sm text-gray-500 mt-1">Haftalik dars soatlari va fanlar taqsimoti</p>
        </div>
        {isAdmin && (
          <div className="flex bg-gray-100 p-1 rounded-lg mt-3 md:mt-0 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'schedule' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Jadval
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'subjects' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Fanlar bazasi
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {activeTab === 'schedule' && (
        <>
          {/* Controls Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Sinfni tanlang:</span>
              <select
                disabled={role !== 'admin' && role !== 'teacher'}
                value={selectedClassId}
                onChange={handleClassChange}
                className="block w-48 px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.grade}-sinf)</option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <button
                onClick={() => openScheduleModal()}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-4.5 h-4.5 mr-1.5" />
                Dars qo'shish
              </button>
            )}
          </div>

          {/* Schedule Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DAYS_OF_WEEK.map(day => {
                const dayLessons = getScheduleForDay(day.value);
                return (
                  <div key={day.value} className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3 flex items-center justify-between">
                      <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        {day.label}
                      </span>
                      <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                        {dayLessons.length} ta dars
                      </span>
                    </div>

                    <div className="p-4 flex-1 divide-y divide-gray-50 space-y-3">
                      {dayLessons.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                          <BookOpen className="w-8 h-8 stroke-1 text-gray-300 mb-2" />
                          <span className="text-xs">Darslar yo'q</span>
                        </div>
                      ) : (
                        dayLessons.map(item => (
                          <div key={item.id} className="pt-3 first:pt-0 group relative flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                {item.lesson_number}-dars
                              </span>
                              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {item.start_time} - {item.end_time}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-start pr-12">
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm md:text-base leading-tight">
                                  {item.subject_name}
                                </h4>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <User className="w-3.5 h-3.5" />
                                  {item.teacher_name}
                                </p>
                              </div>
                            </div>

                            {/* Admin Hover Actions */}
                            {isAdmin && (
                              <div className="absolute right-0 top-3 hidden group-hover:flex items-center gap-1">
                                <button
                                  onClick={() => openScheduleModal(item)}
                                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(item.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Subjects Base Management */}
      {activeTab === 'subjects' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Subject Form */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm h-fit">
            <h3 className="font-bold text-gray-950 mb-4 flex items-center gap-1.5">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Yangi fan qo'shish
            </h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Fan nomi</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Matematika"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Fan kodi (Ixtiyoriy)</label>
                <input
                  type="text"
                  placeholder="Masalan: MATH-101"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors"
              >
                Qo'shish
              </button>
            </form>
          </div>

          {/* Subjects List */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-950 mb-4">Mavjud fanlar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.length === 0 ? (
                <p className="text-gray-400 text-sm py-4">Tizimda fanlar mavjud emas.</p>
              ) : (
                subjects.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-3 border border-gray-50 rounded-xl hover:bg-gray-50 group">
                    <div>
                      <h4 className="font-bold text-gray-950 text-sm">{sub.name}</h4>
                      {sub.code && <span className="text-xs text-gray-500">{sub.code}</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteSubject(sub.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Item Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden transform transition-all">
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-indigo-950">
                {editingSchedule ? 'Darsni tahrirlash' : 'Yangi dars qo\'shish'}
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
              {/* Class Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sinf</label>
                <select
                  required
                  value={scheduleForm.class_id}
                  onChange={(e) => setScheduleForm({...scheduleForm, class_id: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sinfni tanlang</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.grade}-sinf)</option>
                  ))}
                </select>
              </div>

              {/* Subject Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Fan</label>
                <select
                  required
                  value={scheduleForm.subject_id}
                  onChange={(e) => setScheduleForm({...scheduleForm, subject_id: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Fanni tanlang</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Teacher Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">O'qituvchi</label>
                <select
                  required
                  value={scheduleForm.teacher_id}
                  onChange={(e) => setScheduleForm({...scheduleForm, teacher_id: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">O'qituvchini tanlang</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.username} ({t.role === 'admin' ? 'Admin' : 'O\'qituvchi'})</option>
                  ))}
                </select>
              </div>

              {/* Day & Lesson Number Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Hafta kuni</label>
                  <select
                    value={scheduleForm.day_of_week}
                    onChange={(e) => setScheduleForm({...scheduleForm, day_of_week: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Dars raqami</label>
                  <select
                    value={scheduleForm.lesson_number}
                    onChange={(e) => setScheduleForm({...scheduleForm, lesson_number: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {LESSON_NUMBERS.map(n => (
                      <option key={n} value={n}>{n}-dars</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Boshlanishi</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tugashi</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
