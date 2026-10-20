import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Clock, CheckCircle, PlayCircle } from 'lucide-react';

const StudentTests = () => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const res = await api.get('/tests/my');
                setTests(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchTests();
    }, []);

    if (loading) return <div className="flex justify-center p-8 text-gray-500">Yuklanmoqda...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Mening testlarim</h1>

            {tests.length === 0 && (
                <div className="text-center py-12 text-gray-500">Hozircha faol test yo'q.</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tests.map(test => (
                    <div key={test.id} className="bg-white rounded-xl shadow p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-gray-900">{test.title}</h3>
                                <p className="text-sm text-gray-500">{test.subject}</p>
                            </div>
                            {test.completed ? (
                                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                            ) : (
                                <PlayCircle className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" /> {test.time_limit} daqiqa
                            </span>
                            <span>{test.question_count} savol</span>
                        </div>

                        {test.completed ? (
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                <p className="text-green-700 font-semibold text-lg">
                                    {test.score}/{test.total} — {Math.round(test.score / test.total * 100)}%
                                </p>
                                <p className="text-green-600 text-sm">Topshirilgan</p>
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate(`/take-test/${test.id}`)}
                                className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                            >
                                Testni boshlash
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StudentTests;