import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const TakeTest = () => {
    const { testId } = useParams();
    const navigate = useNavigate();

    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({});
    const [currentQ, setCurrentQ] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [violations, setViolations] = useState(0);
    const [warning, setWarning] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showBlocker, setShowBlocker] = useState(false);
    const violationsRef = useRef(0);
    const submittedRef = useRef(false);

    useEffect(() => {
        const fetchTest = async () => {
            try {
                const res = await api.get(`/tests/${testId}/take`);
                setTest(res.data);
                setTimeLeft(res.data.time_limit * 60);
            } catch (err) {
                alert('Test topilmadi');
                navigate('/my-tests');
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [testId]);

    // Fullscreen
    const enterFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
            setShowBlocker(false);
        } catch (e) {
            console.log('Fullscreen error:', e);
        }
    };

    useEffect(() => {
        if (!loading && test) {
            enterFullscreen();
        }
    }, [loading, test]);

    // Fullscreen change listener
    useEffect(() => {
        const handleFSChange = () => {
            const isFS = !!document.fullscreenElement;
            setIsFullscreen(isFS);
            if (!isFS && !submittedRef.current) {
                setShowBlocker(true);
                violationsRef.current += 1;
                setViolations(violationsRef.current);
                if (violationsRef.current >= 3) {
                    setWarning('❌ 3 marta chiqib ketdingiz! Test topshirilmoqda...');
                    setTimeout(() => handleSubmit(true), 2000);
                } else {
                    setWarning(`⚠️ Fullscreen tark etildi! Ogohlantirish ${violationsRef.current}/3`);
                }
            }
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        return () => document.removeEventListener('fullscreenchange', handleFSChange);
    }, []);

    // Tab switch
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden && !submittedRef.current) {
                violationsRef.current += 1;
                setViolations(violationsRef.current);
                setShowBlocker(true);
                if (violationsRef.current >= 3) {
                    setWarning('❌ 3 marta tark etdingiz! Test topshirilmoqda...');
                    setTimeout(() => handleSubmit(true), 2000);
                } else {
                    setWarning(`⚠️ Ogohlantirish ${violationsRef.current}/3: Testni tark etmang!`);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // Block keyboard shortcuts
    useEffect(() => {
        const handleKeydown = (e) => {
            // Block Alt+Tab, Alt+F4, Windows key, Ctrl+W, etc.
            if (e.altKey) { e.preventDefault(); e.stopPropagation(); return false; }
            if (e.key === 'F12') { e.preventDefault(); return false; }
            if (e.key === 'Meta') { e.preventDefault(); return false; }
            if (e.ctrlKey && ['w', 'W', 't', 'T', 'n', 'N', 'r', 'R'].includes(e.key)) {
                e.preventDefault(); return false;
            }
            if (e.key === 'Escape' && !submittedRef.current) {
                e.preventDefault();
                enterFullscreen();
                return false;
            }
        };
        const handleContextMenu = (e) => e.preventDefault();
        const handleCopy = (e) => e.preventDefault();
        const handlePaste = (e) => e.preventDefault();

        document.addEventListener('keydown', handleKeydown, true);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);

        return () => {
            document.removeEventListener('keydown', handleKeydown, true);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
        };
    }, []);

    // Timer
    useEffect(() => {
        if (!test || submitted) return;
        if (timeLeft <= 0) {
            handleSubmit(true);
            return;
        }
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, test, submitted]);

    const handleSubmit = useCallback(async (auto = false) => {
        if (submittedRef.current || submitting) return;
        if (!auto && !window.confirm('Testni topshirishni tasdiqlaysizmi?')) return;

        submittedRef.current = true;
        setSubmitting(true);
        try {
            const res = await api.post(`/tests/${testId}/submit`, { answers });
            setResult(res.data);
            setSubmitted(true);
            setShowBlocker(false);
            try { document.exitFullscreen?.(); } catch (e) { }
        } catch (err) {
            alert('Xato yuz berdi');
            submittedRef.current = false;
        } finally {
            setSubmitting(false);
        }
    }, [answers, submitting, testId]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="text-xl">Yuklanmoqda...</div>
        </div>
    );

    // Result screen
    if (submitted && result) {
        const pct = result.percentage;
        const color = pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="bg-white rounded-2xl p-10 text-center max-w-md w-full shadow-2xl">
                    <div className="text-6xl mb-4">{pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '😔'}</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Test yakunlandi!</h2>
                    <p className="text-gray-500 mb-6">{test.title}</p>
                    <div className={`text-6xl font-bold ${color} mb-2`}>{pct}%</div>
                    <p className="text-gray-600 mb-6">{result.score} / {result.total} to'g'ri javob</p>
                    <button onClick={() => navigate('/my-tests')}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700">
                        Testlarimga qaytish
                    </button>
                </div>
            </div>
        );
    }

    const questions = test?.questions || [];
    const question = questions[currentQ];
    const progress = ((currentQ + 1) / questions.length) * 100;
    const answered = Object.keys(answers).length;
    const isLowTime = timeLeft < 60;

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col select-none">

            {/* BLOCKER — fullscreendan chiqqanda */}
            {showBlocker && !submitted && (
                <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-10 text-center max-w-md w-full mx-4">
                        <div className="text-5xl mb-4">🚫</div>
                        <h2 className="text-xl font-bold text-red-600 mb-2">Test to'xtatildi!</h2>
                        <p className="text-gray-600 mb-2">Siz test oynasidan chiqdingiz.</p>
                        <p className="text-red-500 font-semibold mb-6">
                            Ogohlantirish: {violations}/3
                            {violations >= 3 ? ' — Test avtomatik topshiriladi!' : ''}
                        </p>
                        {violations < 3 && (
                            <button onClick={() => { setShowBlocker(false); setWarning(''); enterFullscreen(); }}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700">
                                Testga qaytish
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Warning toast */}
            {warning && !showBlocker && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-sm font-medium">
                    {warning}
                </div>
            )}

            {/* Header */}
            <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-white font-semibold">{test.title}</h1>
                    <p className="text-gray-400 text-sm">{test.subject}</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-sm text-gray-400">{answered}/{questions.length} javoblandi</div>
                    {!isFullscreen && (
                        <button onClick={enterFullscreen} className="text-xs bg-yellow-500 text-white px-3 py-1 rounded">
                            🔲 Fullscreen
                        </button>
                    )}
                    <div className={`text-2xl font-mono font-bold ${isLowTime ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                        {formatTime(timeLeft)}
                    </div>
                    <button onClick={() => handleSubmit(false)} disabled={submitting}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                        Topshirish
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-700">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
            </div>

            {/* Question */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-sm text-gray-400">Savol {currentQ + 1} / {questions.length}</span>
                        {violations > 0 && (
                            <span className="text-xs text-red-500 font-medium">⚠️ Ogohlantirish: {violations}/3</span>
                        )}
                    </div>

                    <h2 className="text-lg font-semibold text-gray-900 mb-6 leading-relaxed">
                        {question.question_text}
                    </h2>

                    <div className="space-y-3">
                        {['a', 'b', 'c', 'd'].map(opt => (
                            <button key={opt}
                                onClick={() => setAnswers({ ...answers, [question.id]: opt })}
                                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ${answers[question.id] === opt
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                    }`}>
                                <span className="font-bold mr-3 uppercase">{opt})</span>
                                {question[`option_${opt}`]}
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-between mt-8">
                        <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
                            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50">
                            ← Oldingi
                        </button>
                        <div className="flex gap-1 flex-wrap justify-center max-w-xs">
                            {questions.map((q, i) => (
                                <button key={i} onClick={() => setCurrentQ(i)}
                                    className={`w-7 h-7 rounded-full text-xs font-medium ${i === currentQ ? 'bg-indigo-600 text-white'
                                            : answers[q.id] ? 'bg-green-500 text-white'
                                                : 'bg-gray-200 text-gray-600'
                                        }`}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
                            disabled={currentQ === questions.length - 1}
                            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50">
                            Keyingi →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TakeTest;