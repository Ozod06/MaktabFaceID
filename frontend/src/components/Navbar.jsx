import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, BarChart2, ClipboardList, LogOut, BookOpen, Calendar, GraduationCap, QrCode, Settings } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/students', label: 'Students', icon: Users },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/reports', label: 'Reports', icon: BarChart2 },
    // Admin/teacher uchun Tests, student uchun My Tests
    ...(role === 'admin' || role === 'teacher'
      ? [
          { to: '/tests', label: 'Tests', icon: ClipboardList },
          { to: '/schedule', label: 'Dars jadvali', icon: Calendar },
          ...(role === 'teacher' ? [{ to: '/grades', label: 'Baholar', icon: GraduationCap }] : []),
          ...(role === 'admin' ? [
            { to: '/qr-scanner', label: 'QR Scanner', icon: QrCode },
            { to: '/school-settings', label: 'Sozlamalar', icon: Settings }
          ] : [])
        ]
      : [
          { to: '/my-tests', label: 'My Tests', icon: BookOpen },
          { to: '/schedule', label: 'Dars jadvali', icon: Calendar },
          { to: '/student-grades', label: 'Baholarim', icon: GraduationCap }
        ]
    ),
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-6">
            <span className="text-indigo-700 font-bold text-lg">MaktabFaceID</span>
            <div className="flex gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === to
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{username} ({role})</span>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 rounded-md">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;