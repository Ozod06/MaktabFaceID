import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Tests from './pages/Tests';
import TakeTest from './pages/TakeTest';
import StudentTests from './pages/StudentTests';
import TestResults from './pages/TestResults';
import Schedule from './pages/Schedule';
import Grades from './pages/Grades';
import StudentGrades from './pages/StudentGrades';
import SchoolSettings from './pages/SchoolSettings';
import QRScanner from './pages/QRScanner';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* TakeTest - fullscreen, navbarsiz */}
          <Route path="/take-test/:testId" element={
            <PrivateRoute>
              <TakeTest />
            </PrivateRoute>
          } />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Navbar />
                <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/tests" element={<Tests />} />
                    <Route path="/tests/:testId/results" element={<TestResults />} />
                    <Route path="/my-tests" element={<StudentTests />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/grades" element={<Grades />} />
                    <Route path="/student-grades" element={<StudentGrades />} />
                    <Route path="/qr-scanner" element={<QRScanner />} />
                    <Route path="/school-settings" element={<SchoolSettings />} />
                  </Routes>
                </div>
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;