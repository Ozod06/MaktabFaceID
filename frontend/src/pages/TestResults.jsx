import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Download } from 'lucide-react';

const TestResults = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState([]);
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [resultsRes, testRes] = await Promise.all([
                    api.get(`/tests/${testId}/results`),
                    api.get(`/tests/${testId}`)
                ]);
                setResults(resultsRes.data);
                setTest(testRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [testId]);

    const exportCSV = () => {
        const header = "Ism,Kod,Ball,Jami,Foiz,Vaqt\n";
        const rows = results.map(r =>
            `${r.student_name},${r.student_code},${r.score},${r.total},${r.percentage}%,${new Date(r.finished_at).toLocaleString()}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${test?.title || 'test'}_natijalar.csv`;
        a.click();
    };

    if (loading) return <div className="flex justify-center p-8 text-gray-500">Yuklanmoqda...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/tests')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{test?.title} — Natijalar</h1>
                        <p className="text-sm text-gray-500">{results.length} ta o'quvchi topshirdi</p>
                    </div>
                </div>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                    <Download className="w-4 h-4" /> CSV yuklab olish
                </button>
            </div>

            {results.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Hali hech kim topshirmagan.</div>
            ) : (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Ism</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Kod</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">Ball</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">Foiz</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">Baho</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Vaqt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {results.map((r, i) => {
                                const grade = r.percentage >= 86 ? '5' : r.percentage >= 71 ? '4' : r.percentage >= 56 ? '3' : '2';
                                const gradeColor = grade === '5' ? 'text-green-600' : grade === '4' ? 'text-blue-600' : grade === '3' ? 'text-yellow-600' : 'text-red-600';
                                return (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{r.student_name}</td>
                                        <td className="px-4 py-3 text-gray-500">{r.student_code}</td>
                                        <td className="px-4 py-3 text-center">{r.score}/{r.total}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`font-semibold ${r.percentage >= 70 ? 'text-green-600' : r.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {r.percentage}%
                                            </span>
                                        </td>
                                        <td className={`px-4 py-3 text-center font-bold text-lg ${gradeColor}`}>{grade}</td>
                                        <td className="px-4 py-3 text-gray-500">{r.finished_at ? new Date(r.finished_at).toLocaleString() : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TestResults;