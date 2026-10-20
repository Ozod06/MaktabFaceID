import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { QrCode, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

const QRScanner = () => {
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'late'|'error', message: '', data: {} }
  const inputRef = useRef(null);

  // Keep input focused automatically
  useEffect(() => {
    focusInput();
    const interval = setInterval(focusInput, 2000);
    return () => clearInterval(interval);
  }, []);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const code = qrInput.trim();
    if (!code) return;

    setLoading(true);
    setResult(null);
    setQrInput(''); // Clear immediately for the next scan

    try {
      const response = await api.post('/qr/checkin', { qr_code_id: code });
      const data = response.data;
      
      if (data.is_late) {
        setResult({
          type: 'late',
          message: `${data.full_name} kechikib keldi.`,
          data: data
        });
      } else {
        setResult({
          type: 'success',
          message: data.already_marked 
            ? `${data.full_name} avvalroq belgilanib bo'lingan.` 
            : `${data.full_name} o'z vaqtida keldi.`,
          data: data
        });
      }
    } catch (err) {
      console.error(err);
      setResult({
        type: 'error',
        message: err.response?.data?.detail || 'QR Kod aniqlanmadi yoki xatolik yuz berdi.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
          <QrCode className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">QR-Kod Terminali</h1>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Skanerni yo'naltiring yoki QR kod ID-sini quyiga kiriting. Tizim avtomatik ravishda davomatni qayd etadi.
        </p>
      </div>

      {/* Simulator Visualizer */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden aspect-video shadow-2xl flex flex-col items-center justify-center p-6 group">
        {/* Hologram overlay scan lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_95%,rgba(99,102,241,0.15)_95%)] bg-[size:100%_20px] animate-[pulse_3s_infinite] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[bounce_4s_infinite] pointer-events-none"></div>
        
        {/* Corners */}
        <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
        <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
        <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
        <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>

        {loading ? (
          <div className="text-center space-y-3 z-10 text-indigo-400">
            <RefreshCw className="w-12 h-12 animate-spin mx-auto text-indigo-500" />
            <p className="text-sm font-semibold tracking-wider animate-pulse">TEKSHIRILMOQDA...</p>
          </div>
        ) : (
          <form onSubmit={handleScanSubmit} className="w-full max-w-xs z-10 space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-center font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm shadow-inner"
                placeholder="QR kod kodini kiriting..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
              />
              <button 
                type="submit" 
                className="hidden"
              >
                Scan
              </button>
            </div>
            <p className="text-center text-[11px] text-slate-500 animate-pulse font-medium">
              Skaner kutilmoqda. Avtomatik fokus faol.
            </p>
          </form>
        )}
      </div>

      {/* Result Cards */}
      {result && (
        <div className="animate-[slideUp_0.3s_ease-out]">
          {result.type === 'success' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start space-x-4 shadow-sm">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-emerald-950">Muvaffaqiyatli</h3>
                <p className="text-sm text-emerald-800 mt-1">{result.message}</p>
                {result.data && (
                  <div className="mt-3 flex items-center space-x-4 text-xs text-emerald-600 font-semibold bg-emerald-100/50 py-1.5 px-3 rounded-lg w-fit">
                    <span>Vaqt: {result.data.time}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>O'z vaqtida keldi</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.type === 'late' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start space-x-4 shadow-sm">
              <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-amber-950">Kechikdi</h3>
                <p className="text-sm text-amber-800 mt-1">{result.message}</p>
                {result.data && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="text-amber-700 bg-amber-100 py-1.5 px-3 rounded-lg">
                      Vaqt: {result.data.time}
                    </span>
                    <span className="text-red-700 bg-red-100 py-1.5 px-3 rounded-lg">
                      Kechikish: {result.data.minutes_late} daqiqa
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.type === 'error' && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start space-x-4 shadow-sm">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-rose-950">Xatolik</h3>
                <p className="text-sm text-rose-800 mt-1">{result.message}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QRScanner;
