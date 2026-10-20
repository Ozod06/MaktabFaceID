import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import StudentCard from '../components/StudentCard';
import { Plus, Camera, X, QrCode, Printer } from 'lucide-react';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const videoRef = useRef(null);

  // New student form state
  const [formData, setFormData] = useState({
    full_name: '',
    student_code: '',
    class_id: '',
    parent_telegram_id: ''
  });

  const fetchData = async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
       api.get('/students/'),
api.get('/classes/')
      ]);
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.delete(`/students/${id}`);
        setStudents(students.filter(s => s.id !== id));
      } catch (err) {
        alert('Failed to delete student');
      }
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/students', formData);
      setShowAddModal(false);
      setFormData({ full_name: '', student_code: '', class_id: '', parent_telegram_id: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add student');
    }
  };

  const handleGenerateQR = async (studentId) => {
    setQrLoading(true);
    try {
      const response = await api.post(`/qr/generate/${studentId}`);
      setQrCodeData(response.data);
      setShowQRModal(true);
    } catch (err) {
      console.error(err);
      alert('QR kodini yaratishda xatolik yuz berdi');
    } finally {
      setQrLoading(false);
    }
  };

  const startCamera = async (studentId) => {
    setSelectedStudentId(studentId);
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Could not access camera');
      setShowCameraModal(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowCameraModal(false);
  };

  const captureAndRegister = async () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('image', blob, 'face.jpg');
      
      try {
        await api.post(`/students/${selectedStudentId}/register-face`, formData);
        alert('Face registered successfully!');
        stopCamera();
        fetchData();
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to register face');
      }
    }, 'image/jpeg');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Students Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map(student => (
          <div key={student.id} className="relative group">
            <StudentCard student={student} onDelete={handleDelete} />
            <div className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
               <button
                onClick={() => startCamera(student.id)}
                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full shadow-sm"
                title="Register Face"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleGenerateQR(student.id)}
                disabled={qrLoading}
                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full shadow-sm disabled:opacity-50"
                title="Generate QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Add New Student
                    </h3>
                    <div className="mt-4">
                      <form onSubmit={handleAddSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Full Name</label>
                          <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Student Code</label>
                          <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={formData.student_code} onChange={e => setFormData({...formData, student_code: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Class</label>
                          <select required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})}>
                            <option value="">Select a class...</option>
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Parent Telegram ID (Optional)</label>
                          <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={formData.parent_telegram_id} onChange={e => setFormData({...formData, parent_telegram_id: e.target.value})} />
                        </div>
                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                          <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm">
                            Save
                          </button>
                          <button type="button" onClick={() => setShowAddModal(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-90 transition-opacity"></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button type="button" onClick={stopCamera} className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Register Face</h3>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                </div>
                <div className="mt-6 flex justify-center">
                  <button onClick={captureAndRegister} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                    <Camera className="w-5 h-5 mr-2" />
                    Capture & Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrCodeData && (
        <div className="fixed z-20 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowQRModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full p-6 relative">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button type="button" onClick={() => setShowQRModal(false)} className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-lg font-medium text-gray-900">QR Kod</h3>
                <div className="bg-white p-4 border border-gray-100 rounded-xl inline-block shadow-sm">
                  <img src={qrCodeData.qr_image} alt="Student QR Code" className="w-48 h-48 mx-auto" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-mono select-all">ID: {qrCodeData.qr_code_id}</p>
                </div>
                <div className="pt-2 flex space-x-3">
                  <button
                    onClick={() => {
                      const win = window.open('', '_blank');
                      win.document.write(`
                        <html>
                          <head>
                            <title>QR Code</title>
                            <style>
                              body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; margin: 0; }
                              img { width: 300px; height: 300px; }
                              p { font-size: 20px; font-weight: bold; margin-top: 20px; }
                            </style>
                          </head>
                          <body onload="window.print(); window.close();">
                            <img src="${qrCodeData.qr_image}" />
                            <p>Student QR Code</p>
                          </body>
                        </html>
                      `);
                      win.document.close();
                    }}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Chop etish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
