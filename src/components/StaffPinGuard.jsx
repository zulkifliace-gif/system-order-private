import React, { useState } from 'react';
import { useOrder } from '../context/OrderContext';
import { Lock, KeyRound, ShieldAlert, ArrowLeft, Delete } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StaffPinGuard({ children, roleTitle = 'Staf Restoran' }) {
  const { receiptSettings } = useOrder();

  // Dynamic PIN from SQLite Settings (can be changed in Admin UI) or fallback '1234'
  const targetPin = receiptSettings?.staffPin || '1234';

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('is_staff_authenticated') === 'true' || 
           sessionStorage.getItem('fb_staff_auth') === 'true';
  });

  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleKeyPress = (num) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
      setErrorMsg('');
      
      // Auto verify when 4 digits reached
      if (nextPin.length === 4) {
        if (nextPin === targetPin) {
          sessionStorage.setItem('is_staff_authenticated', 'true');
          sessionStorage.setItem('fb_staff_auth', 'true');
          setIsAuthenticated(true);
        } else {
          setErrorMsg('PIN Keselamatan Salah! Akses Ditolak.');
          setTimeout(() => setPinInput(''), 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-rose-500 selection:text-white">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-6 animate-fadeIn relative">
        
        {/* Header Icon */}
        <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Kunci Akses {roleTitle}</h2>
          <p className="text-xs text-slate-400">Masukkan 4-Digit PIN Keselamatan Staf untuk Meneruskan</p>
        </div>

        {/* PIN Display Dots */}
        <div className="flex justify-center items-center gap-3 my-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                pinInput.length > idx
                  ? 'bg-rose-500 border-rose-400 scale-110 shadow-md shadow-rose-500/50'
                  : 'bg-slate-950 border-slate-800'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold p-2.5 rounded-2xl flex items-center justify-center gap-2 animate-bounce">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-lg font-extrabold text-white rounded-2xl transition transform active:scale-95 shadow-sm"
            >
              {num}
            </button>
          ))}

          <Link
            to="/"
            className="py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-2xl transition flex items-center justify-center"
            title="Batal & Utama"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <button
            onClick={() => handleKeyPress('0')}
            className="py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-lg font-extrabold text-white rounded-2xl transition transform active:scale-95 shadow-sm"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-2xl transition flex items-center justify-center"
            title="Padam"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800/80">
          🔑 PIN Keselamatan: <strong className="text-amber-400 font-bold">{targetPin}</strong>
        </div>

      </div>
    </div>
  );
}
