
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student } from '../types';
import { changeStudentPassword } from '../services/auth';
import { getSetting, saveSetting } from '../services/db';
import { testConnection } from '../services/cloudService';
import { User, Lock, KeyRound, Loader2, ShieldCheck, Hash, Cloud, Link, Save, CheckCircle2, XCircle } from 'lucide-react';

const Settings: React.FC = () => {
  const { student, isReadOnly } = useOutletContext<{ student: Student, isReadOnly: boolean }>();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cloud State
  const [cloudUrl, setCloudUrl] = useState('');
  const [folderName, setFolderName] = useState('SKM_Backups');
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  useEffect(() => {
      const load = async () => {
          const url = await getSetting('cloud_script_url');
          const folder = await getSetting('backup_folder_name');
          if (url) setCloudUrl(url);
          if (folder) setFolderName(folder);
      };
      load();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 4) {
      setMessage({ text: 'Password must be at least 4 characters.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      await changeStudentPassword(student.id, newPassword);
      setMessage({ text: 'Password updated successfully!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setMessage({ text: 'Failed to update password.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCloud = async () => {
      if (!cloudUrl.trim()) {
          alert("Please enter the Teacher's Link.");
          return;
      }
      setIsSavingCloud(true);
      await saveSetting('cloud_script_url', cloudUrl.trim());
      await saveSetting('backup_folder_name', folderName.trim());
      setIsSavingCloud(false);
      
      // Test
      setConnectionStatus('testing');
      const success = await testConnection();
      setConnectionStatus(success ? 'success' : 'failed');
      if(success) alert("Connected to Class Successfully! You can now use the 'Save to Teacher' button.");
      else alert("Settings Saved, but connection check failed. Please double check the link or ensure you have internet.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">My Profile & Settings</h2>
        <p className="text-lg text-gray-500">Manage your account details and login security.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <User size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Student Profile</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
              <p className="text-lg font-bold text-gray-900">{student.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Student ID</label>
                  <div className="flex items-center gap-2 text-gray-700 font-mono bg-gray-50 px-3 py-2 rounded-lg w-fit">
                    <Hash size={16} /> {student.id}
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Login Username</label>
                  <div className="flex items-center gap-2 text-gray-700 font-mono bg-gray-50 px-3 py-2 rounded-lg w-fit">
                    <User size={16} /> {student.username || student.id}
                  </div>
               </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Academic Batch</label>
              <div className="flex items-center gap-2">
                 <span className={`px-3 py-1 rounded-full text-sm font-bold ${student.curriculum === 'IGCSE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {student.curriculum}
                 </span>
                 <span className="text-gray-600 font-medium">{student.batch}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Security</h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-5">
             <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      disabled={isReadOnly}
                    />
                </div>
             </div>

             <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      disabled={isReadOnly}
                    />
                </div>
             </div>

             {message && (
               <div className={`p-3 rounded-xl text-sm font-bold text-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message.text}
               </div>
             )}

             {isReadOnly ? (
                 <p className="text-sm text-gray-500 italic text-center bg-gray-50 p-3 rounded-xl">
                    Admins cannot change student passwords here. Use the Student List page.
                 </p>
             ) : (
                <button 
                    type="submit" 
                    disabled={isSaving || !newPassword}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : 'Update Password'}
                </button>
             )}
          </form>
        </div>
      </div>

      {/* Cloud Connection (Student Side) */}
      {!isReadOnly && (
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                  <Cloud size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Connect to Class</h3>
                    <p className="text-sm text-gray-500">Enter the link provided by your teacher to sync your work.</p>
                </div>
              </div>

              <div className="space-y-4 max-w-2xl">
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Teacher's Link (Script URL)</label>
                      <input 
                          className="w-full border p-3 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none font-mono text-sm"
                          placeholder="https://script.google.com/..."
                          value={cloudUrl}
                          onChange={e => setCloudUrl(e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Class Code (Folder Name)</label>
                      <input 
                          className="w-full border p-3 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none"
                          placeholder="SKM_Backups"
                          value={folderName}
                          onChange={e => setFolderName(e.target.value)}
                      />
                  </div>
                  
                  <div className="flex items-center gap-4 pt-2">
                      <button 
                          onClick={handleSaveCloud}
                          disabled={isSavingCloud}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2"
                      >
                          {isSavingCloud ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                          Connect & Save
                      </button>
                      {connectionStatus === 'success' && <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={18}/> Connected</span>}
                      {connectionStatus === 'failed' && <span className="text-red-500 font-bold flex items-center gap-1"><XCircle size={18}/> Failed</span>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;
