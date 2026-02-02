
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Book, Globe, ArrowRight, LogOut, KeyRound, Loader2, Lock, Settings, Image as ImageIcon, ShieldCheck, CheckCircle2, Zap, Maximize, Minimize } from 'lucide-react';
import { logout, changeAdminPassword } from '../services/auth';

const SKMLogoLarge = () => (
  <svg width="200" height="80" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
    <rect width="200" height="80" rx="16" fill="url(#paint0_linear_large)" />
    <text x="100" y="48" textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize="42" fontWeight="900" fill="#FFFFFF" letterSpacing="-1" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))' }}>SKM</text>
    <text x="100" y="68" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="11" fontWeight="400" fill="#E0E7FF" opacity="0.95">Scholarly Knowledge Monitor</text>
    <defs>
      <linearGradient id="paint0_linear_large" x1="0" y1="0" x2="200" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563EB" />
        <stop offset="1" stopColor="#4F46E5" />
      </linearGradient>
    </defs>
  </svg>
);

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const docEl = document.documentElement as any;
    const doc = document as any;

    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      if (docEl.requestFullscreen) docEl.requestFullscreen();
      else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();
      else if (docEl.mozRequestFullScreen) docEl.mozRequestFullScreen();
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
    } else {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else if (doc.msExitFullscreen) doc.msExitFullscreen();
      else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword.length < 3) {
          setPassError('Password is too short.');
          return;
      }
      if (newPassword !== confirmPassword) {
          setPassError('Passwords do not match.');
          return;
      }

      setIsSavingPass(true);
      try {
          await changeAdminPassword(newPassword);
          setShowPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
          alert('Admin password updated successfully.');
      } catch (e) {
          setPassError('Failed to update password.');
      } finally {
          setIsSavingPass(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center justify-center font-sans relative">
      {/* Utility Bar */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <button 
            onClick={toggleFullscreen}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black shadow-lg transition-all transform active:scale-95 ${isFullscreen ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            <span>{isFullscreen ? 'EXIT FULL SCREEN' : 'FULL SCREEN'}</span>
        </button>
      </div>

      <div className="max-w-6xl w-full">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8 text-center md:text-left">
          <div className="animate-fade-in">
            <SKMLogoLarge />
            <h1 className="text-5xl font-black text-gray-900 mt-6 tracking-tight">Admin Dashboard</h1>
            <p className="text-xl text-gray-500 font-medium mt-2">Cycle: 2025-2026 Academic Year</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-3">
             <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-200 font-bold text-sm shadow-sm">
                <ShieldCheck size={18} />
                <span>System Status: ONLINE & SECURE</span>
             </div>
             <button 
                onClick={() => { logout(); navigate('/login'); }} 
                className="flex items-center gap-2 text-red-500 hover:text-red-700 font-bold transition-colors bg-white px-4 py-2 rounded-xl border border-red-100 shadow-sm"
             >
                <LogOut size={20} /> Sign Out
             </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Main Curriculum Cards */}
          <Link to="/curriculum/IGCSE" className="group bg-white p-10 rounded-[2.5rem] shadow-xl hover:shadow-2xl border-2 border-blue-50 hover:border-blue-400 transition-all transform hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Book size={120} className="text-blue-600" />
            </div>
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Globe size={32} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">IGCSE Portal</h2>
            <p className="text-gray-500 text-lg font-medium leading-relaxed mb-8">Manage FM 4 (2026) and FM 5 (2025) board batches. Track attainments and practical skills.</p>
            <div className="flex items-center gap-2 text-blue-600 font-black text-lg">
               Manage Students <ArrowRight size={20} className="transition-transform group-hover:translate-x-2" />
            </div>
          </Link>

          <Link to="/curriculum/MYP" className="group bg-white p-10 rounded-[2.5rem] shadow-xl hover:shadow-2xl border-2 border-green-50 hover:border-green-400 transition-all transform hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Book size={120} className="text-green-600" />
            </div>
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <Book size={32} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">MYP Portal</h2>
            <p className="text-gray-500 text-lg font-medium leading-relaxed mb-8">Manage IB Middle Years Program. Track Criteria A-D and ATL Skill development.</p>
            <div className="flex items-center gap-2 text-green-600 font-black text-lg">
               Manage Students <ArrowRight size={20} className="transition-transform group-hover:translate-x-2" />
            </div>
          </Link>

          {/* Utility Cards */}
          <Link to="/admin/challenge-library" className="bg-white p-8 rounded-3xl shadow-lg border border-purple-50 hover:border-purple-200 transition-all flex items-center gap-6 group">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <ImageIcon size={28} />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-xl text-gray-800">Gatekeeper Bank</h3>
                <p className="text-gray-400 text-sm font-medium">Manage challenge diagrams and images.</p>
            </div>
            <ArrowRight size={24} className="text-gray-300 group-hover:text-purple-600 transition-colors" />
          </Link>

          <Link to="/admin/settings" className="bg-white p-8 rounded-3xl shadow-lg border border-indigo-50 hover:border-indigo-200 transition-all flex items-center gap-6 group">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Settings size={28} />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-xl text-gray-800">System Settings</h3>
                <p className="text-gray-400 text-sm font-medium">Cloud sync, backups, and automation code.</p>
            </div>
            <ArrowRight size={24} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
          </Link>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-2xl flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400"><ShieldCheck size={24}/></div>
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-blue-400">Security PIN</p>
                    <p className="text-lg font-bold">2025 (Active)</p>
                </div>
            </div>
            <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-2xl flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-2xl text-green-400"><CheckCircle2 size={24}/></div>
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-green-400">AI Integrity</p>
                    <p className="text-lg font-bold">Zero-Hallucination Active</p>
                </div>
            </div>
            <button 
                onClick={() => setShowPasswordModal(true)}
                className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-2xl flex items-center gap-4 hover:border-indigo-500 transition-all text-left"
            >
                <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400"><KeyRound size={24}/></div>
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-amber-400">Admin Account</p>
                    <p className="text-lg font-bold">Change Password</p>
                </div>
            </button>
        </div>
      </div>

      {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Lock size={24} className="text-indigo-600"/> Update Admin Password</h3>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">New Password</label><input type="password" autoFocus className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required /></div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Confirm Password</label><input type="password" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required /></div>
                      {passError && <p className="text-red-500 text-xs font-bold">{passError}</p>}
                      <div className="flex gap-2 pt-4">
                          <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 text-gray-500 font-bold">Cancel</button>
                          <button type="submit" disabled={isSavingPass} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2">
                              {isSavingPass ? <Loader2 className="animate-spin" size={18}/> : 'Save Changes'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Welcome;
