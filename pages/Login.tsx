
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin, loginStudent } from '../services/auth';
import { getStudentSyncData } from '../services/cloudService';
import { createStudent } from '../services/storageService';
import { saveSetting } from '../services/db';
import { User, Lock, ArrowRight, Loader2, GraduationCap, ShieldCheck, Cloud, Download, XCircle, KeyRound, Info } from 'lucide-react';

const SKMLogo = () => (
  <svg width="130" height="48" viewBox="0 0 130 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
    <rect width="130" height="48" rx="8" fill="url(#paint0_linear_login)" />
    <text x="65" y="28" textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize="24" fontWeight="900" fill="#FFFFFF" letterSpacing="-0.5" style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.15))' }}>SKM</text>
    <text x="65" y="42" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="7.5" fontWeight="400" fill="#E0E7FF" opacity="0.95">Scholarly Knowledge Monitor</text>
    <defs>
      <linearGradient id="paint0_linear_login" x1="0" y1="0" x2="130" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563EB" />
        <stop offset="1" stopColor="#4F46E5" />
      </linearGradient>
    </defs>
  </svg>
);

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminPin, setAdminPin] = useState(''); 
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncUrl, setSyncUrl] = useState('');
  const [syncRootFolder, setSyncRootFolder] = useState('SKM_Backups');
  const [syncBatch, setSyncBatch] = useState('');
  const [syncId, setSyncId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const MASTER_PIN = "2025";

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        const success = await loginStudent(studentId, password);
        if (success) navigate(`/student/${studentId}`);
        else setError('Invalid credentials. If you are on a new device, click "Sync Account" first.');
    } catch (e) { setError('Login failed.'); }
    finally { setIsLoading(false); }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    if (adminUser.toLowerCase() !== 'admin') { setError('Invalid Username.'); setIsLoading(false); return; }
    if (adminPin !== MASTER_PIN) { setError('Access Denied: Invalid Master Passcode.'); setIsLoading(false); return; }
    const success = await loginAdmin(adminPass);
    if (success) navigate('/welcome');
    else setError('Invalid Password.');
    setIsLoading(false);
  };

  const handleSyncAccount = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!syncUrl || !syncBatch || !syncId || !syncRootFolder) { setSyncMsg("All fields required."); return; }
      setIsSyncing(true);
      setSyncMsg("Connecting...");
      
      try {
          await saveSetting('cloud_script_url', syncUrl.trim());
          await saveSetting('backup_folder_name', syncRootFolder.trim());
          
          const res = await getStudentSyncData(syncBatch.trim(), syncId.trim(), syncRootFolder.trim(), syncUrl.trim());
          
          if (res.result === 'success' && res.data) {
              await createStudent(res.data);
              setSyncMsg("Success!");
              setTimeout(() => {
                  setShowSyncModal(false);
                  setStudentId(syncId);
                  alert("Account Loaded! Log in now.");
              }, 1000);
          } else {
              setSyncMsg("Not found. Has the teacher pushed your account?");
          }
      } catch (err: any) {
          setSyncMsg("Connection Error.");
      } finally {
          setIsSyncing(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-10 cursor-pointer" onClick={() => { setMode(prev => prev === 'STUDENT' ? 'TEACHER' : 'STUDENT'); setError(''); }}>
         <SKMLogo />
      </div>

      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
         <div className="p-8 pt-10 min-h-[400px] flex flex-col justify-center">
             {mode === 'STUDENT' ? (
                 <div className="animate-fade-in">
                     <form onSubmit={handleStudentLogin} className="space-y-6">
                         <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600"><GraduationCap size={32} /></div>
                            <h2 className="text-2xl font-bold text-gray-800">Student Login</h2>
                         </div>
                         <div className="space-y-4">
                            <div className="relative"><User className="absolute left-4 top-3.5 text-gray-400" size={20} /><input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Student ID" className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-blue-500/10" required /></div>
                            <div className="relative"><Lock className="absolute left-4 top-3.5 text-gray-400" size={20} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-blue-500/10" required /></div>
                         </div>
                         {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
                         <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 className="animate-spin" /> : <>Login <ArrowRight size={20}/></>}
                         </button>
                     </form>
                     <div className="mt-8 text-center border-t border-gray-100 pt-6">
                        <button onClick={() => setShowSyncModal(true)} className="text-sm font-bold text-blue-600 hover:underline flex items-center justify-center gap-2 mx-auto">
                            <Cloud size={16}/> New device? Sync Account
                        </button>
                     </div>
                 </div>
             ) : (
                 <form onSubmit={handleTeacherLogin} className="animate-fade-in space-y-6">
                     <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600"><ShieldCheck size={32} /></div>
                        <h2 className="text-2xl font-bold text-gray-800">Admin Portal</h2>
                        <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mt-1">Access Bridge Active</div>
                     </div>
                     <div className="space-y-4">
                        <input type="text" value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="Username" className="w-full px-4 py-3 rounded-xl border border-gray-200" required />
                        <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-gray-200" required />
                        <div className="relative">
                            <input type="password" value={adminPin} onChange={e => setAdminPin(e.target.value)} placeholder="Master PIN" className="w-full px-4 py-3 rounded-xl border border-gray-200 tracking-tight" required />
                            <KeyRound className="absolute right-3 top-3.5 text-gray-300" size={18} />
                        </div>
                     </div>
                     {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
                     <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg">Authenticate & Unlock</button>
                 </form>
             )}
         </div>
      </div>
      <p className="mt-8 text-gray-400 text-sm font-medium">&copy; 2024-2026 Scholarly Knowledge Monitor</p>

      {showSyncModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
                  <button onClick={() => setShowSyncModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"><XCircle size={28}/></button>
                  <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Sync My Account</h3>
                      <p className="text-sm text-gray-500 mt-1">Fetch your profile from the teacher's cloud.</p>
                  </div>
                  <form onSubmit={handleSyncAccount} className="space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Teacher's Cloud URL</label>
                          <input className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono" placeholder="https://script.google.com/..." value={syncUrl} onChange={e => setSyncUrl(e.target.value)} required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Main Folder Name</label>
                            <input className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" placeholder="SKM_Backups" value={syncRootFolder} onChange={e => setSyncRootFolder(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Batch Code</label>
                            <input className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" placeholder="fm5-25" value={syncBatch} onChange={e => setSyncBatch(e.target.value)} required />
                        </div>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Your Student ID</label>
                          <input className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold" placeholder="e.g. 7137" value={syncId} onChange={e => setSyncId(e.target.value)} required />
                      </div>
                      {syncMsg && <div className={`text-center text-xs font-bold py-2 rounded-lg ${syncMsg.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700'}`}>{syncMsg}</div>}
                      <button type="submit" disabled={isSyncing} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2">
                          {isSyncing ? <Loader2 className="animate-spin" size={20}/> : <Download size={20}/>} {isSyncing ? 'Fetching...' : 'Fetch Account'}
                      </button>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex gap-2">
                          <Info size={16} className="text-blue-500 shrink-0 mt-0.5"/>
                          <p className="text-[10px] text-blue-700 leading-tight">Ensure your teacher has clicked 'Push to Cloud' on their computer before you try syncing.</p>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
export default Login;
