import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, UserCheck, UserMinus, Activity } from 'lucide-react';
import AttendanceTable from '../components/AttendanceTable';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_students: 0,
    present_students: 0,
    absent_students: 0,
    attendance_rate: 0
  });
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const statsRes = await api.get(`/reports/daily?report_date=${today}`);
      setStats(statsRes.data);

      const attRes = await api.get('/attendance/today');
      // Sort by time descending and take top 10
      const sorted = attRes.data.sort((a, b) => (a.time < b.time ? 1 : -1)).slice(0, 10);
      setRecentAttendance(sorted);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  const statCards = [
    { name: 'Total Students', value: stats.total_students, icon: Users, color: 'bg-blue-500' },
    { name: 'Present Today', value: stats.present_students, icon: UserCheck, color: 'bg-green-500' },
    { name: 'Absent Today', value: stats.absent_students, icon: UserMinus, color: 'bg-red-500' },
    { name: 'Attendance Rate', value: `${stats.attendance_rate}%`, icon: Activity, color: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500">Live updating every 30s</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${item.color} rounded-md p-3`}>
                    <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd className="text-2xl font-bold text-gray-900">{item.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <AttendanceTable records={recentAttendance} />
      </div>
    </div>
  );
};

export default Dashboard;
