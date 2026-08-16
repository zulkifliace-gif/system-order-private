import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { Monitor, Smartphone, UtensilsCrossed, PlayCircle, RefreshCw, Zap, ShieldCheck, CheckCircle2, Settings } from 'lucide-react';
import FinancialPerformanceModule from '../components/FinancialPerformanceModule';

export default function Home() {
  const { seedSampleDemo, resetDemoData, tables, orders } = useOrder();
  const navigate = useNavigate();

  const activeTablesCount = tables.filter(t => t.status !== 'KOSONG').length;
  const pendingOrdersCount = orders.filter(o => o.kitchen_status !== 'SERVED').length;

  const handleQuickDemo = () => {
    seedSampleDemo();
    // Navigate directly to counter or open customer page sample
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      
      {/* Top Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/LajuQ logo.svg"
            alt="LajuQ Logo"
            className="h-10 w-auto object-contain drop-shadow-md"
          />
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight text-white flex items-center">
              Laju<span className="text-amber-500">Q</span>
            </h1>
            <p className="text-xs text-slate-400">Portal Staf Dalaman — Akses Terhad</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>STAF SAHAJA</span>
          </div>
          <button 
            onClick={resetDemoData}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition"
            title="Reset semua data kepada asal"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 space-y-12">
        
        {/* 3 Main Interfaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Kaunter POS */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:shadow-rose-950/20 group">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Interface 1</span>
                <h3 className="text-xl font-bold text-slate-100">Kaunter / POS Panel</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Urus 20 meja, jana Dynamic QR Session Slip untuk pelanggan baharu, dan proses bayaran (Confirm Payment & Close Session).
              </p>
              <ul className="text-xs space-y-1.5 text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Grid Status Meja Kosong/Aktif
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Dynamic QR Code Generator
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Semak Item & Confirm Payment
                </li>
              </ul>
            </div>

            <Link
              to="/counter"
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20 text-sm"
            >
              <span>Buka POS Kaunter</span>
              <span>→</span>
            </Link>
          </div>

          {/* Card 2: Web Menu Pelanggan */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:shadow-rose-950/20 group">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Interface 2</span>
                <h3 className="text-xl font-bold text-slate-100">Web Menu Pelanggan</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Urus senarai menu restoran, muat naik gambar hidangan, edit harga & pilihan, kemudian uji menu sebagai pelanggan.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Edit Menu & Upload Gambar Hidangan
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Modal Modifiers & Sticky Cart
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Live Kitchen Status & Sesi Tamat Screen
                </li>
              </ul>
            </div>

            <Link
              to="/menu-editor"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-rose-600/20 text-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Edit Menu Restoran</span>
              <span>→</span>
            </Link>
          </div>

          {/* Card 3: Kitchen Display System (KDS) */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:shadow-rose-950/20 group">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">Interface 3</span>
                <h3 className="text-xl font-bold text-slate-100">Kitchen Display (KDS)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Skrin dapur mod gelap (High Contrast Dark Mode) dengan notifikasi bunyi audio beep untuk tukang masak menukar status masakan.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Audio Autoplay Activation Overlay
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Highlights Special Notes & Modifiers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Action Buttons: Mula Masak / Ready / Clear
                </li>
              </ul>
            </div>

            <Link
              to="/kitchen"
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 text-sm"
            >
              <span>Buka Skrin Dapur (KDS)</span>
              <span>→</span>
            </Link>
          </div>

        </div>

        {/* Real-Time Workflow Testing Guide */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">Panduan Ujian Aliran Pesanan Real-Time (Step-by-Step)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="font-extrabold text-blue-400 text-sm">Langkah 1</div>
              <div className="font-bold text-slate-200">Kaunter Jana QR</div>
              <p className="text-slate-400">Buka <strong>/counter</strong>, klik Meja Kosong (cth: Meja 1) & tekan "Jana Session QR".</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="font-extrabold text-rose-400 text-sm">Langkah 2</div>
              <div className="font-bold text-slate-200">Pelanggan Pesan</div>
              <p className="text-slate-400">Tekan "Simulasikan Buka Web Pelanggan". Pilih menu, customize options & tekan <strong>"HANTAR PESANAN"</strong>.</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="font-extrabold text-amber-400 text-sm">Langkah 3</div>
              <div className="font-bold text-slate-200">Dapur Terima & Masak</div>
              <p className="text-slate-400">Buka <strong>/kitchen</strong> (aktifkan bunyi audio). Skrin berbunyi Beep 🔔. Tukang masak tekan "Mula Masak" & "Siap".</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="font-extrabold text-emerald-400 text-sm">Langkah 4</div>
              <div className="font-bold text-slate-200">Bayaran & Sesi Tamat</div>
              <p className="text-slate-400">Di Kaunter, klik Meja 1 & tekan "Confirm Payment & Close Session". Skrin pelanggan bertukar ke <strong>Sesi Tamat</strong>.</p>
            </div>
          </div>
        </div>

        {/* MODUL PRESTASI & LAPORAN KEWANGAN LHDN */}
        <FinancialPerformanceModule />

      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Laju<span className="text-amber-500 font-bold">Q</span> F&B Order System • Portal Staf (<strong className="text-slate-400">URL: /staff</strong>) • Powered by React & Vite
      </footer>

    </div>
  );
}
