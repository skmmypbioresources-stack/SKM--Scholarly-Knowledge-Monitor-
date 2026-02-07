
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, PeerMarkingTask } from '../types';
import { getPeerMarkingTasks, savePeerMarkingTask, savePeerMarkingTasksList, getAllStudents } from '../services/db';
import { syncPeerMarkingTasks, getPeerMarkingFromCloud, uploadFileToCloud, testConnection } from '../services/cloudService';
import { Users2, Upload, Download, CheckCircle2, Clock, Send, FileText, Loader2, RefreshCw, ChevronRight, X, AlertCircle, Search, UserPlus } from 'lucide-react';

const PeerMarking: React.FC = () => {
  const { student } = useOutletContext<{ student: Student }>();
  const [activeTab, setActiveTab] = useState<'MY_SUBMISSIONS' | 'TO_MARK'>('MY_SUBMISSIONS');
  const [tasks, setTasks] = useState<PeerMarkingTask[]>([]);
  const [batchPeers, setBatchPeers] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitTitle, setSubmitTitle] = useState('');
  const [selectedMarkerId, setSelectedMarkerId] = useState('');
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [schemeFile, setSchemeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadData();
    fetchPeers();
  }, [student.batch]);

  const loadData = async () => {
    setIsLoading(true);
    // Initial load from local cache
    const localTasks = await getPeerMarkingTasks(student.batch);
    setTasks(localTasks);
    
    // Auto-sync from cloud to see new requests
    await handleSync();
    setIsLoading(false);
  };

  const fetchPeers = async () => {
      const all = await getAllStudents();
      setBatchPeers(all.filter(s => s.batch === student.batch && s.id !== student.id));
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
        const res = await getPeerMarkingFromCloud(student.batch);
        if (res.result === 'success' && Array.isArray(res.data)) {
            await savePeerMarkingTasksList(res.data);
            setTasks(res.data);
        }
    } catch (e) {
        console.error("Peer Sync Failed", e);
    } finally {
        setIsSyncing(false);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
    });
  };

  const handleNewSubmission = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!submitTitle || !selectedMarkerId || !scriptFile || !schemeFile) return;

      setIsUploading(true);
      try {
          const marker = batchPeers.find(p => p.id === selectedMarkerId);
          
          // 1. Upload Script to Cloud
          const scriptBase64 = await convertToBase64(scriptFile);
          const scriptRes = await uploadFileToCloud(scriptBase64, `PEER_SCRIPT_${student.id}_${Date.now()}.pdf`, scriptFile.type);
          
          // 2. Upload Scheme to Cloud
          const schemeBase64 = await convertToBase64(schemeFile);
          const schemeRes = await uploadFileToCloud(schemeBase64, `PEER_SCHEME_${student.id}_${Date.now()}.pdf`, schemeFile.type);

          if (scriptRes.result !== 'success' || schemeRes.result !== 'success') throw new Error("Upload Failed");

          const newTask: PeerMarkingTask = {
              id: `peer_${Date.now()}`,
              title: submitTitle,
              batchId: student.batch,
              studentId: student.id,
              studentName: student.name,
              assignedMarkerId: selectedMarkerId,
              assignedMarkerName: marker?.name || 'Peer',
              scriptUrl: scriptRes.data.url,
              schemeUrl: schemeRes.data.url,
              status: 'Pending',
              dateSubmitted: Date.now()
          };

          // Update shared list
          const updatedTasks = [newTask, ...tasks];
          await savePeerMarkingTask(newTask);
          await syncPeerMarkingTasks(student.batch, updatedTasks);
          
          setTasks(updatedTasks);
          setIsSubmitModalOpen(false);
          resetForm();
          alert("Submission Sent to " + newTask.assignedMarkerName);
      } catch (err) {
          alert("Could not upload files. Check Cloud connection.");
      } finally {
          setIsUploading(false);
      }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: 'Marking' | 'Completed') => {
      const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      setTasks(updated);
      await syncPeerMarkingTasks(student.batch, updated);
  };

  const resetForm = () => {
      setSubmitTitle('');
      setSelectedMarkerId('');
      setScriptFile(null);
      setSchemeFile(null);
  };

  const mySubmissions = tasks.filter(t => t.studentId === student.id);
  const assignmentsToMark = tasks.filter(t => t.assignedMarkerId === student.id);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <Users2 className="text-indigo-600" size={40}/> Peer Marking Center
                </h2>
                <p className="text-lg text-gray-500 font-medium mt-1">Independent exchange for student collaborative marking.</p>
            </div>
            <div className="flex gap-3">
                <button onClick={handleSync} disabled={isSyncing} className="bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
                    {isSyncing ? <Loader2 className="animate-spin" size={20}/> : <RefreshCw size={20}/>} Sync Center
                </button>
                <button onClick={() => setIsSubmitModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-2 transform active:scale-95 transition-all">
                    <UserPlus size={20}/> Assign Peer Mark
                </button>
            </div>
        </div>

        <div className="flex gap-4 border-b border-gray-100 pb-px">
            <button 
                onClick={() => setActiveTab('MY_SUBMISSIONS')}
                className={`px-8 py-4 font-black text-sm uppercase tracking-widest transition-all border-b-4 ${activeTab === 'MY_SUBMISSIONS' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                My Submissions ({mySubmissions.length})
            </button>
            <button 
                onClick={() => setActiveTab('TO_MARK')}
                className={`px-8 py-4 font-black text-sm uppercase tracking-widest transition-all border-b-4 ${activeTab === 'TO_MARK' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                Marking Requests ({assignmentsToMark.length})
            </button>
        </div>

        <div className="grid gap-6">
            {activeTab === 'MY_SUBMISSIONS' ? (
                mySubmissions.length > 0 ? mySubmissions.map(task => (
                    <div key={task.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center group hover:shadow-md transition-all">
                        <div className="flex items-center gap-6 mb-4 md:mb-0">
                            <div className={`p-4 rounded-2xl ${task.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                {task.status === 'Completed' ? <CheckCircle2 size={32}/> : <Clock size={32}/>}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{task.title}</h3>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Assigned to: <span className="text-indigo-600">{task.assignedMarkerName}</span></p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${task.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {task.status}
                                </span>
                                <p className="text-[10px] text-gray-300 font-bold mt-1 uppercase">{new Date(task.dateSubmitted).toLocaleDateString()}</p>
                            </div>
                            <div className="h-10 w-px bg-gray-100 hidden md:block"></div>
                            <div className="flex gap-2">
                                <a href={task.scriptUrl} target="_blank" className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="View My Script"><FileText size={20}/></a>
                                <a href={task.schemeUrl} target="_blank" className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="View Scheme"><Download size={20}/></a>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                        <Users2 size={64} className="mx-auto text-gray-200 mb-6"/>
                        <p className="text-gray-400 font-black text-xl uppercase tracking-widest">No submissions yet</p>
                        <p className="text-gray-400 text-sm mt-2">Click 'Assign Peer Mark' to send your paper to a classmate.</p>
                    </div>
                )
            ) : (
                assignmentsToMark.length > 0 ? assignmentsToMark.map(task => (
                    <div key={task.id} className="bg-white p-8 rounded-[2rem] border-2 border-indigo-50 shadow-sm flex flex-col md:flex-row justify-between items-center transition-all">
                        <div className="flex items-center gap-6 mb-6 md:mb-0">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                                <FileText size={32}/>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 leading-tight">{task.title}</h3>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Requested by: <span className="text-indigo-600">{task.studentName}</span></p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex gap-2">
                                <a href={task.scriptUrl} target="_blank" className="flex items-center gap-2 bg-blue-50 text-blue-700 px-5 py-3 rounded-xl font-bold hover:bg-blue-100 transition-all">
                                    <Download size={18}/> DOWNLOAD SCRIPT
                                </a>
                                <a href={task.schemeUrl} target="_blank" className="flex items-center gap-2 bg-teal-50 text-teal-700 px-5 py-3 rounded-xl font-bold hover:bg-teal-100 transition-all">
                                    <FileText size={18}/> MARKING SCHEME
                                </a>
                            </div>
                            
                            <div className="h-10 w-px bg-gray-100 hidden lg:block"></div>
                            
                            {task.status === 'Completed' ? (
                                <div className="bg-green-100 text-green-700 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2">
                                    <CheckCircle2 size={18}/> MARKING FINISHED
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    {task.status === 'Pending' && (
                                        <button onClick={() => handleUpdateStatus(task.id, 'Marking')} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-black text-sm shadow-md hover:bg-amber-600 transition-all">
                                            ACCEPT & START
                                        </button>
                                    )}
                                    {task.status === 'Marking' && (
                                        <button onClick={() => handleUpdateStatus(task.id, 'Completed')} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-md hover:bg-green-700 transition-all flex items-center gap-2">
                                            MARK AS DONE
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-24 bg-indigo-50/30 rounded-[3rem] border-2 border-dashed border-indigo-100">
                        <Clock size={64} className="mx-auto text-indigo-100 mb-6"/>
                        <p className="text-indigo-300 font-black text-xl uppercase tracking-widest">Inbox Clean</p>
                        <p className="text-indigo-300/60 text-sm mt-2 font-bold">You have no pending assignments to mark for peers.</p>
                    </div>
                )
            )}
        </div>

        {/* SUBMISSION MODAL */}
        {isSubmitModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-600"><Users2 size={120}/></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">Assign Peer Marking</h3>
                        <button onClick={() => setIsSubmitModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={32}/></button>
                    </div>

                    <form onSubmit={handleNewSubmission} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Assessment Title</label>
                            <input required value={submitTitle} onChange={e=>setSubmitTitle(e.target.value)} placeholder="e.g. End of Term Biology Mock" className="w-full bg-slate-50 border-2 border-gray-50 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all font-bold" />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Assigned Marker (Batch Peer)</label>
                            <select required value={selectedMarkerId} onChange={e=>setSelectedMarkerId(e.target.value)} className="w-full bg-slate-50 border-2 border-gray-50 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all font-bold">
                                <option value="">Select a student...</option>
                                {batchPeers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                            </select>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-blue-50/50 p-6 rounded-3xl border-2 border-dashed border-blue-100 relative group transition-all hover:bg-blue-50">
                                <input required type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => setScriptFile(e.target.files?.[0] || null)}/>
                                <div className="text-center">
                                    <Upload size={24} className="mx-auto text-blue-400 mb-2"/>
                                    <p className="text-blue-900 font-black text-xs uppercase tracking-widest">Your Script (PDF)</p>
                                    {scriptFile && <p className="text-xs text-blue-600 mt-2 font-bold truncate">{scriptFile.name}</p>}
                                </div>
                            </div>
                            <div className="bg-teal-50/50 p-6 rounded-3xl border-2 border-dashed border-teal-100 relative group transition-all hover:bg-teal-50">
                                <input required type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => setSchemeFile(e.target.files?.[0] || null)}/>
                                <div className="text-center">
                                    <Upload size={24} className="mx-auto text-teal-400 mb-2"/>
                                    <p className="text-teal-900 font-black text-xs uppercase tracking-widest">Marking Scheme</p>
                                    {schemeFile && <p className="text-xs text-teal-600 mt-2 font-bold truncate">{schemeFile.name}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                             <AlertCircle className="text-amber-500 shrink-0" size={18}/>
                             <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-tighter">Your paper will be shared directly with the chosen marker. This does not affect your official grade logs.</p>
                        </div>

                        <button type="submit" disabled={isUploading} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                            {isUploading ? <Loader2 className="animate-spin" size={24}/> : <Send size={24}/>}
                            {isUploading ? 'UPLOADING...' : 'SEND TO PEER'}
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default PeerMarking;
