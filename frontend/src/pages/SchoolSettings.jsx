import React, { useState, useEffect } from 'react';
import api from '../api';
import { Settings, Clock, ShieldAlert, Save, CheckCircle } from 'lucide-react';

const SchoolSettings = () => {
  const [startTime, setStartTime] = useState('08:30');
  const [lateThreshold, setLateThreshold] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings/');
        setStartTime(response.data.school_start_time);
        setLateThreshold(response.data.late_threshold_minutes);
      } catch (err) {
        setError('Sozlamalarni yuklab bo\'lmadi');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await api.put('/settings/', {
        school_start_time: startTime,
        late_threshold_minutes: parseInt(lateThreshold, 10)
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Sozlamalarni saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Settings className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Maktab Sozlamalari</h1>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Kirish taqiqlangan
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Maktab sozlamalarini o'zgartirish huquqi faqatgina tizim administratorlariga berilgan.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-150 overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-3.5 rounded-lg border border-red-100 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-700 p-3.5 rounded-lg border border-green-100 text-sm flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Sozlamalar muvaffaqiyatli saqlandi!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Dars boshlanish vaqti</span>
                </label>
                <input
                  type="time"
                  required
                  disabled={!isAdmin}
                  className="w-full border border-gray-350 rounded-lg shadow-sm py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Ushbu vaqtdan boshlab kelganlar hisobga olinadi.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-1.5">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span>Kechikish chegarasi (daqiqa)</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  disabled={!isAdmin}
                  className="w-full border border-gray-350 rounded-lg shadow-sm py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                  value={lateThreshold}
                  onChange={(e) => setLateThreshold(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Ruxsat etilgan kechikish vaqti (ushbu daqiqadan keyin kechikkan hisoblanadi).
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SchoolSettings;
