import React from 'react';
import { UserCircle, Trash2 } from 'lucide-react';

const StudentCard = ({ student, onDelete }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5 flex items-center space-x-4">
        <div className="flex-shrink-0">
          {student.photo_path ? (
            <img
              src={`http://localhost:8000${student.photo_path}`}
              alt={student.full_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100"
            />
          ) : (
            <UserCircle className="w-16 h-16 text-gray-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{student.full_name}</p>
          <p className="text-sm text-gray-500 truncate">Code: {student.student_code}</p>
          <div className="mt-1 flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${student.has_face_registered ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {student.has_face_registered ? 'Face Registered' : 'No Face'}
            </span>
          </div>
        </div>
        <div>
          <button
            onClick={() => onDelete(student.id)}
            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-50 transition-colors"
            title="Delete Student"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentCard;
