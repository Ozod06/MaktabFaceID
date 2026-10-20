import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Trash2, ToggleLeft, ToggleRight, Eye, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

const Tests = () => {
    const [tests, setTests] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);
    const [expandedTest, setExpandedTest] = useState(null);

    const [createForm, setCreateForm] = useState({ title: '', subject: '', class_id: '', time_limit: 30 });
    const [questionForm, setQuestionForm] = useState({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a' });
    const [generateForm, setGenerateForm] = useState({ topic: '', num_questions: 10, difficulty: 'medium' });
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [testsRes, classesRes] = await Promise.all([
                api.get('/tests/'),
                api.get('/classes/')
            ]);
            setTests(testsRes.data);
            setClasses(classesRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createTest = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/tests/', {
                ...createForm,
                class_id: createForm.class_id ? parseInt(createForm.class_id) : null,
                time_limit: parseInt(createForm.time_limit)
            });
            setTests([...tests, res.data]);
            setShowCreateModal(false);
            setCreateForm({ title: '', subject: '', class_id: '', time_limit: 30 });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xato yuz berdi');
        }
    };

    const addQuestion = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/tests/${selectedTest.id}/questions`, questionForm);
            setQuestionForm({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a' });
            fetchData();
            alert("Savol qo'shildi!");
        } catch (err) {
            alert('Xato yuz berdi');
        }
    };

    const generateQuestions = async (e) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const res = await api.post(`/tests/${selectedTest.id}/generate`, {
                ...generateForm,
                num_questions: parseInt(generateForm.num_questions)
            });
            alert(`✅ ${res.data.generated} ta savol yaratildi!`);
            setShowGenerateModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || 'AI xato berdi');
        } finally {
            setGenerating(false);
        }
    };

    const toggleTest = async (id) => {
        try {
            const res = await api.patch(`/tests/${id}/toggle`);
            setTests(tests.map(t => t.id === id ? { ...t, is_active: res.data.is_active } : t));
        } catch (err) {
            alert('Xato');
        }
    };

    const deleteTest = async (id) => {
        if (!window.confirm("Testni o'chirishni tasdiqlaysizmi?")) return;
        try {
            await api.delete(`/tests/${id}`);
            setTests(tests.filter(t => t.id !== id));
        } catch (err) {
            alert('Xato');
        }
    };

    if (loading) return <div className="flex justify-center p-8"><div className="text-gray-500">Yuklanmoqda...</div></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Testlar boshqaruvi</h1>
                <button onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
                    <Plus className="w-4 h-4 mr-2" /> Yangi test
                </button>
            </div>

            {/* Tests list */}
            <div className="space-y-3">
                {tests.length === 0 && (
                    <div className="text-center py-12 text-gray-500">Hali test yo'q. Yangi test yarating!</div>
                )}
                {tests.map(test => (
                    <div key={test.id} className="bg-white rounded-lg shadow p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-gray-900">{test.title}</h3>
                                <p className="text-sm text-gray-500">{test.subject} • {test.time_limit} daqiqa • {test.question_count} savol</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${test.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {test.is_active ? 'Faol' : 'Nofaol'}
                                </span>
                                <button onClick={() => toggleTest(test.id)} className="p-1 text-gray-400 hover:text-indigo-600">
                                    {test.is_active ? <ToggleRight className="w-5 h-5 text-indigo-600" /> : <ToggleLeft className="w-5 h-5" />}
                                </button>
                                <button onClick={() => { setSelectedTest(test); setShowAddQuestionModal(true); }}
                                    className="p-1 text-gray-400 hover:text-indigo-600" title="Savol qo'shish">
                                    <Plus className="w-5 h-5" />
                                </button>
                                <button onClick={() => { setSelectedTest(test); setShowGenerateModal(true); }}
                                    className="p-1 text-gray-400 hover:text-yellow-500" title="AI bilan yaratish">
                                    <Sparkles className="w-5 h-5" />
                                </button>
                                <button onClick={() => window.location.href = `/tests/${test.id}/results`}
                                    className="p-1 text-gray-400 hover:text-blue-600" title="Natijalar">
                                    <Eye className="w-5 h-5" />
                                </button>
                                <button onClick={() => deleteTest(test.id)} className="p-1 text-gray-400 hover:text-red-600">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                                    className="p-1 text-gray-400">
                                    {expandedTest === test.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Expanded questions */}
                        {expandedTest === test.id && (
                            <div className="mt-4 border-t pt-4 space-y-2">
                                {test.question_count === 0 ? (
                                    <p className="text-sm text-gray-400">Savollar yo'q</p>
                                ) : (
                                    <p className="text-sm text-gray-600">{test.question_count} ta savol mavjud</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Create Test Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-lg font-bold mb-4">Yangi test yaratish</h2>
                        <form onSubmit={createTest} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sarlavha</label>
                                <input required className="mt-1 block w-full border rounded-md px-3 py-2 text-sm" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fan</label>
                                <input required className="mt-1 block w-full border rounded-md px-3 py-2 text-sm" value={createForm.subject} onChange={e => setCreateForm({ ...createForm, subject: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sinf (ixtiyoriy)</label>
                                <select className="mt-1 block w-full border rounded-md px-3 py-2 text-sm" value={createForm.class_id} onChange={e => setCreateForm({ ...createForm, class_id: e.target.value })}>
                                    <option value="">Barcha sinflar</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Vaqt (daqiqa)</label>
                                <input type="number" required min="5" max="180" className="mt-1 block w-full border rounded-md px-3 py-2 text-sm" value={createForm.time_limit} onChange={e => setCreateForm({ ...createForm, time_limit: e.target.value })} />
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Yaratish</button>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 border py-2 rounded-md text-sm">Bekor</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Question Modal */}
            {showAddQuestionModal && selectedTest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg my-8">
                        <h2 className="text-lg font-bold mb-4">Savol qo'shish — {selectedTest.title}</h2>
                        <form onSubmit={addQuestion} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Savol matni</label>
                                <textarea required rows={3} className="mt-1 block w-full border rounded-md px-3 py-2 text-sm" value={questionForm.question_text} onChange={e => setQuestionForm({ ...questionForm, question_text: e.target.value })} />
                            </div>
                            {['a', 'b', 'c', 'd'].map(opt => (
                                <div key={opt}>
                                    <label className="block text-sm font-medium text-gray-700">Variant {opt.toUpperCase()}</label>
                                    <input required className="mt-1 block w-full border rounded-md px-3 py-2 text-sm" value={questionForm[`option_${opt}`]} onChange={e => setQuestionForm({ ...questionForm, [`option_${opt}`]: e.target.value })} />
                                </div>
                            ))}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">To'g'ri javob</label>
                                <select className="mt-1 block w-full border rounded-md px-3 py-2 text-sm" value={questionForm.correct_answer} onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}>
                                    <option value="a">A</option>
                                    <option value="b">B</option>
                                    <option value="c">C</option>
                                    <option value="d">D</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Qo'shish</button>
                                <button type="button" onClick={() => setShowAddQuestionModal(false)} className="flex-1 border py-2 rounded-md text-sm">Yopish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Generate Questions Modal */}
            {showGenerateModal && selectedTest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-lg font-bold mb-1">AI bilan savollar yaratish</h2>
                        <p className="text-sm text-gray-500 mb-4">{selectedTest.title} — {selectedTest.subject}</p>
                        <form onSubmit={generateQuestions} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mavzu</label>
                                <input required placeholder="Masalan: Fotosintez jarayoni" className="mt-1 block w-full border rounded-md px-3 py-2 text-sm" value={generateForm.topic} onChange={e => setGenerateForm({ ...generateForm, topic: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Savollar soni</label>
                                <input type="number" min="3" max="20" className="mt-1 block w-full border rounded-md px-3 py-2 text-sm" value={generateForm.num_questions} onChange={e => setGenerateForm({ ...generateForm, num_questions: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Qiyinlik</label>
                                <select className="mt-1 block w-full border rounded-md px-3 py-2 text-sm" value={generateForm.difficulty} onChange={e => setGenerateForm({ ...generateForm, difficulty: e.target.value })}>
                                    <option value="easy">Oson</option>
                                    <option value="medium">O'rta</option>
                                    <option value="hard">Qiyin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button type="submit" disabled={generating} className="flex-1 bg-yellow-500 text-white py-2 rounded-md text-sm font-medium hover:bg-yellow-600 disabled:opacity-50">
                                    {generating ? '⏳ Yaratilmoqda...' : '✨ Yaratish'}
                                </button>
                                <button type="button" onClick={() => setShowGenerateModal(false)} className="flex-1 border py-2 rounded-md text-sm">Bekor</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tests;