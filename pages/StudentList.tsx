
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Curriculum, Student } from '../types';
import { getStudents, exportData, importData, createStudent, removeStudent, updateStudentsBatch } from '../services/storageService';
import { getSetting, updateLastBackupTime } from '../services/db';
import { changeStudentPassword } from '../services/auth';
import { getBatchStudentsFromCloud, syncManyStudents } from '../services/cloudService';
import { Search, User, ChevronLeft, Settings, Download, Upload, Loader2, Database, UserPlus, AlertTriangle, KeyRound, Lock, Trash2, XCircle, RefreshCw, FileCheck2, Cloud } from 'lucide-react';
import { INITIAL_TOPICS_IGCSE, INITIAL_TOPICS_MYP } from '../services/mockData';

const StudentList: React.FC = () => {
  const { curriculum, batchId } = useParams<{ curriculum: string, batchId: string }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [lastBackup, setLastBackup] = useState<number | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  
  const [studentToReset, setStudentToReset] = useState<Student | null>(null);
  const [newResetPass, setNewResetPass] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  
  const [isSyncingBatch, setIsSyncingBatch] = useState(false);
  const [isPushingBatch, setIsPushingBatch] = useState(false);
  
  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    const allStudents = await getStudents();
    const filtered = allStudents.filter(s => s.curriculum === curriculum && s.batch === batchId);
    setStudents(filtered);
    const backupTime = await getSetting('last_backup_timestamp');
    setLastBackup(backupTime || null);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [curriculum, batchId]);

  const handleCloudPull = async () => {
    if (!batchId) return;
    setIsSyncingBatch(true);
    try {
        const response = await getBatchStudentsFromCloud(batchId);
        if (response.result === 'success' && Array.isArray(response.data)) {
            await updateStudentsBatch(response.data);
            await fetchData();
            alert(`Synced ${response.data.length} student accounts from cloud.`);
        } else {
            alert("No student data found for this batch on the cloud.");
        }
    } catch (e) {
        alert("Pull Failed. Check Admin Settings.");
    } finally { setIsSyncingBatch(false); }
  };

  const handleCloudPush = async () => {
      if (!batchId) return;
      if (students.length === 0) return;
      setIsPushingBatch(true);
      try {
          const res = await syncManyStudents(batchId, students);
          if (res.result === 'success') {
              alert("Success: All student accounts pushed to cloud. They can now log in on any device.");
          }
      } catch (e) {
          alert("Push Failed. Verify your Cloud Link in Admin Settings.");
      } finally { setIsPushingBatch(false); }
  };

  const handleAddStudent = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if(!newStudentName.trim() || !newStudentId.trim()) return;

    if(students.some(s => s.id === newStudentId)) {
        alert("ID already exists."); return;
    }

    const topics = curriculum === Curriculum.IGCSE ? INITIAL_TOPICS_IGCSE : INITIAL_TOPICS_MYP; 
    const newStudent: Student = { 
        id: newStudentId, 
        username: newStudentId, 
        password: '1234', 
        name: newStudentName, 
        curriculum: curriculum as Curriculum, 
        batch: batchId!, 
        assessments: [], 
        termAssessments: [], 
        topics: JSON.parse(JSON.stringify(topics)), 
        attendance: [], 
        tuitionTasks: [], 
        tuitionReflections: [], 
        differentiationResources: [], 
        targetGrade: curriculum === Curriculum.IGCSE ? 'A' : '6', 
        chatHistory: [], 
        aiUsage: { date: new Date().toISOString().split('T')[0], count: 0 } 
    }; 
    await createStudent(newStudent); 
    setNewStudentName(''); setNewStudentId(''); setIsAddModalOpen(false); 
    fetchData(); 
  };

  const handleResetPassword = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!studentToReset || !newResetPass) return; 
      setIsResetting(true); 
      try { 
          await changeStudentPassword(studentToReset.id, newResetPass); 
          alert(`Updated password for ${studentToReset.name}. Click 'Push to Cloud' to update their remote profile.`); 
          setStudentToReset(null); setNewResetPass(''); 
      } finally { setIsResetting(false); } 
  };

  const handleDeleteStudent = async () => {
      if (!studentToDelete) return;
      await removeStudent(studentToDelete.id);
      setStudentToDelete(null);
      fetchData();
  };

  const handleDeleteBatch = async () => {
      if (!batchId) return;
      if (!confirm(`Delete ALL students in ${batchId}?`)) return;
      for (const s of students) await removeStudent(s.id);
      setBatchDeleteConfirm(false); fetchData();
  };

  const handleExport = async () => { const json = await exportData(); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `SKM_Backup_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); await updateLastBackupTime(); setLastBackup(Date.now()); };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const reader = new FileReader(); reader.onload = async (ev) => { try { await importData(ev.target?.result as string); navigate('/login'); } catch (e) { alert("Invalid File"); } }; reader.readAsText(e.target.files[0]); } };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search));
  const isIGCSE = curriculum === Curriculum.IGCSE;
  const themeColor = isIGCSE ? 'text-blue-600' : 'text-green-600';
  const themeBg = isIGCSE ? 'bg-blue-50' : 'bg-green-50';
  const buttonBg = isIGCSE ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <button onClick={() => navigate(`/curriculum/${curriculum}`)} className="flex items-center text-gray-500 hover:text-gray-800"><ChevronLeft size={22} /> Back to Batches</button>
            <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200"><Settings size={20} /> Data & Backup</button>
        </div>

        {showSettings && (
            <div className="bg-white border rounded-2xl p-8 mb-10 shadow-lg animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6">
                    <h2 className="font-bold text-xl text-gray-800">System Maintenance</h2>
                    {lastBackup && <p className="text-xs text-gray-400">Last Backup: {new Date(lastBackup).toLocaleString()}</p>}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                         <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Data Management</h3>
                         <div className="flex gap-4">
                            <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100 hover:bg-blue-100 font-medium transition-colors"><Download size={20} /> Backup Data</button>
                            <div className="flex-1 relative flex items-center justify-center gap-2 bg-gray-50 text-gray-700 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-100 font-medium cursor-pointer transition-colors hover:border-gray-300">
                                <Upload size={20} /> Restore Data 
                                <input type="file" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer"/>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={14}/> Danger Zone</h3>
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                            {!batchDeleteConfirm ? (
                                <button onClick={() => setBatchDeleteConfirm(true)} className="w-full bg-white border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white transition-colors">Clear Entire Batch</button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => setBatchDeleteConfirm(false)} className="flex-1 bg-white border border-gray-200 text-gray-500 py-2 rounded-lg text-sm font-bold">Cancel</button>
                                    <button onClick={handleDeleteBatch} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700">Confirm</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h1 className="text-4xl font-extrabold text-gray-900">Student List</h1>
                <p className="text-gray-600 mt-2 font-medium">{curriculum} <span className="mx-2">•</span> <span className="bg-gray-200 px-2 py-0.5 rounded text-sm text-gray-700 font-bold uppercase">{batchId}</span></p>
            </div>
            <div className="flex flex-wrap gap-2">
                 <Link to={`/curriculum/${curriculum}/batch/${batchId}/resources`} className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm font-bold hover:bg-gray-50">
                    <Database size={18} /> Resources
                 </Link>
                 <Link to={`/curriculum/${curriculum}/batch/${batchId}/assessments`} className="flex items-center gap-2 px-4 py-2.5 bg-white text-purple-700 border border-purple-200 rounded-xl shadow-sm font-bold hover:bg-purple-50">
                    <FileCheck2 size={18} /> Assessments
                 </Link>
                 <button onClick={handleCloudPull} disabled={isSyncingBatch} className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 border border-indigo-200 rounded-xl shadow-sm font-bold hover:bg-indigo-50">
                    {isSyncingBatch ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Pull Cloud
                 </button>
                 <button onClick={handleCloudPush} disabled={isPushingBatch || students.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl shadow-sm font-bold hover:bg-indigo-100">
                    {isPushingBatch ? <Loader2 className="animate-spin" size={18}/> : <Cloud size={18}/>} Push to Cloud
                 </button>
                 <button onClick={() => setIsAddModalOpen(true)} className={`flex items-center gap-2 px-5 py-2.5 ${buttonBg} text-white rounded-xl shadow-md font-bold`}>
                    <UserPlus size={18} /> Add Student
                 </button>
            </div>
        </div>

        <div className="relative mb-10">
          <Search className="absolute left-4 top-4 text-gray-400" />
          <input type="text" placeholder="Search by name or ID..." className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="grid gap-3">
          {filteredStudents.length > 0 ? filteredStudents.map(student => (
              <div key={student.id} className="group flex items-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className={`p-3 rounded-full ${themeBg} mr-4`}><User className={`w-6 h-6 ${themeColor}`} /></div>
                  <Link to={`/student/${student.id}/records`} className="flex-1 block">
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-600">{student.name}</h3>
                        <p className="text-gray-400 font-mono text-xs">ID: {student.id}</p>
                  </Link>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setStudentToReset(student); setNewResetPass(''); }} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl" title="Reset Pass"><KeyRound size={18} /></button>
                      <button onClick={() => setStudentToDelete(student)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl" title="Delete"><Trash2 size={18} /></button>
                      <Link to={`/student/${student.id}/records`} className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><ChevronLeft size={20} className="rotate-180" /></Link>
                  </div>
              </div>
          )) : <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border-2 border-dashed">No students found. Add one and click 'Push to Cloud'.</div>}
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
                  <h3 className="font-bold text-xl text-gray-900 mb-6 flex justify-between items-center">New Student <button onClick={()=>setIsAddModalOpen(false)}><XCircle className="text-gray-400"/></button></h3>
                  <form onSubmit={handleAddStudent} className="space-y-4">
                      <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">ID (Username)</label><input autoFocus className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 7137" value={newStudentId} onChange={e=>setNewStudentId(e.target.value)} /></div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name</label><input className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. John Doe" value={newStudentName} onChange={e=>setNewStudentName(e.target.value)} /></div>
                      <button type="submit" className={`w-full py-3 ${buttonBg} text-white rounded-xl font-bold shadow-md`}>Create Student</button>
                  </form>
              </div>
          </div>
      )}

      {/* Reset Modal */}
      {studentToReset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl">
                  <h3 className="font-bold text-xl text-gray-900 mb-2 flex items-center gap-2"><Lock size={20} className="text-amber-500"/> Reset Password</h3>
                  <p className="text-sm text-gray-500 mb-6">Updating for <strong>{studentToReset.name}</strong>.</p>
                  <form onSubmit={handleResetPassword}>
                      <input type="password" autoFocus className="w-full border p-3 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-amber-500" placeholder="New Password" value={newResetPass} onChange={e=>setNewResetPass(e.target.value)} required />
                      <div className="flex justify-end gap-2"><button type="button" onClick={() => setStudentToReset(null)} className="px-4 py-2 text-gray-500">Cancel</button><button type="submit" disabled={isResetting} className="px-6 py-2 bg-amber-500 text-white rounded-xl font-bold">{isResetting ? 'Saving...' : 'Update'}</button></div>
                  </form>
              </div>
          </div>
      )}

      {/* Delete Modal */}
      {studentToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center">
                  <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
                  <h3 className="font-bold text-xl mb-2">Delete Student?</h3>
                  <p className="text-gray-500 mb-6 text-sm">This removes <strong>{studentToDelete.name}</strong> from your list. They won't be able to log in.</p>
                  <div className="flex gap-2"><button onClick={() => setStudentToDelete(null)} className="flex-1 py-2 text-gray-500 font-bold">Cancel</button><button onClick={handleDeleteStudent} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold">Delete</button></div>
              </div>
          </div>
      )}
    </div>
  );
};
export default StudentList;
