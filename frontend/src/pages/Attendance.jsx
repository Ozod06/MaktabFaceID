import React, { useState, useEffect } from 'react';
import api from '../api';
import AttendanceTable from '../components/AttendanceTable';
import { Filter, Download } from 'lucide-react';

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [attRes, classesRes] = await Promise.all([
        api.get(`/attendance/today${classFilter ? `?class_id=${classFilter}` : ''}`),
        api.get('/classes')
      ]);
      setRecords(attRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      console.error('Error fetching attendance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [classFilter]);

  const exportCsv = () => {
    const today = new Date().toISOString().split('T')[0];
    const url = `http://localhost:8000/reports/export?report_date=${today}${classFilter ? `&class_id=${classFilter}` : ''}`;
    
    // Create a temporary link to download
    const link = document.createElement('a');
    link.href = url;
    // adding token for auth
    const token = localStorage.getItem('token');
    if (token) {
       // Note: To properly pass auth for file downloads, either use fetch with blob, or pass token in URL. 
       // For this simple implementation, we'll fetch blob and trigger download.
       fetch(url, {
         headers: { 'Authorization': `Bearer ${token}` }
       })
       .then(res => res.blob())
       .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `attendance_${today}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
       });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Today's Attendance</h1>
        
        <div className="flex space-x-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              className="pl-10 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm border"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={exportCsv}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <AttendanceTable records={records} />
      )}
    </div>
  );
};

export default Attendance;
