
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AssessmentTask, Curriculum } from '../types';
import { addAssessmentTask, getAssessmentTasks, removeAssessmentTask, saveAssessmentTasksList } from '../services/storageService';
import { uploadFileToCloud, syncAssessmentTasks, getAssessmentTasksFromCloud, testConnection } from '../services/cloudService';
import { ChevronLeft, Plus, Trash2, Download, Loader2, RefreshCw, FileCheck2 } from 'lucide-react';

const BatchAssessmentTasks: React.FC = () => {
    const { curriculum, batchId } = useParams<{ curriculum: string, batchId: string }>();
    const navigate = useNavigate();
    const isIGCSE = curriculum === Curriculum.IGCSE;

    const [tasks, setTasks] = useState<AssessmentTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState<string>(isIGCSE ? 'AO1' : 'CritA');
    const [qpFile, setQpFile] = useState<File | null>(null);
    const [msFile, setMsFile] = useState<File | null>(null);
    const [creatingStep, setCreatingStep] = useState<'IDLE' | 'UPLOADING' | 'SAVING'>('IDLE');

    const CATEGORIES = isIGCSE 
        ? [
            { id: 'AO1', label: 'AO1: Knowledge' },
            { id: 'AO2', label: 'AO2: Problem Solving' },
            { id: 'AO3', label: 'AO3: Experimental' }
          ]
        : [
            { id: 'CritA', label: 'Crit A: Knowing' },
            { id: 'CritB', label: 'Crit B: Inquiring' },
            { id: 'CritC', label: 'Crit C: Processing' },
            { id: 'CritD', label: 'Crit D: Reflecting' }
          ];

    useEffect(() => { loadTasks(); }, [batchId]);

    const loadTasks = async () => {
        if (!batchId) return;
        setLoading(true);
        const t = await getAssessmentTasks(batchId);
        setTasks(t.sort((a, b) => b.dateCreated - a.dateCreated));
        setLoading(false);
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
        });
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !qpFile || !msFile || !batchId) return alert("Please fill all fields.");

        setCreatingStep('UPLOADING');
        try {
            // 1. Upload QP
            const qpBase64 = await convertToBase64(qpFile);
            const qpRes = await uploadFileToCloud(qpBase64, `QP_${batchId}_${newCategory}_${newTitle}.pdf`, qpFile.type);
            if (qpRes.result !== 'success') throw new Error("QP Upload Failed: " + qpRes.error);

            // 2. Prepare MS (Base64 only for AI)
            const msBase64 = await convertToBase64(msFile);

            const newTask: AssessmentTask = {
                id: Date.now().toString(),
                batchId: batchId,
                curriculum: curriculum as Curriculum,
                category: newCategory as any,
                title: newTitle,
                questionPaperUrl: qpRes.data.url,
                markingSchemeBase64: msBase64, 
                markingSchemeMimeType: msFile.type,
                dateCreated: Date.now()
            };

            setCreatingStep('SAVING');
            await addAssessmentTask(newTask);

            // 3. SYNC TO CLOUD LIST
            const allTasks = await getAssessmentTasks(batchId);
            const syncRes = await syncAssessmentTasks(batchId, allTasks);
            
            if(syncRes.result === 'success') {
                alert("Task Created & Synced to all students!");
            } else {
                alert("Task saved locally but Cloud Sync failed. Check settings.");
            }

            await loadTasks();
            setIsCreating(false);
            setNewTitle(''); setQpFile(null); setMsFile(null);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setCreatingStep('IDLE');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this task for all students?")) return;
        if (!batchId) return;

        await removeAssessmentTask(id);
        const remaining = await getAssessmentTasks(batchId);
        await syncAssessmentTasks(batchId, remaining); // Sync deletion
        loadTasks();
    };

    const handleCloudSync = async () => {
        if (!batchId) return;
        setIsSyncing(true);
        try {
            const res = await getAssessmentTasksFromCloud(batchId);
            if (res.result === 'success' && res.data) {
                await saveAssessmentTasksList(res.data);
                await loadTasks();
                alert("Synced from Cloud.");
            } else {
                alert("No tasks found in cloud for this batch.");
            }
        } catch (e) {
            alert("Sync Error.");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => navigate(`/curriculum/${curriculum}/batch/${batchId}`)} className="flex items-center text-gray-500 hover:text-gray-900 font-bold mb-8">
                    <ChevronLeft size={20} /> Back to Student List
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">Manage Assessments</h1>
                        <p className="text-gray-500 mt-1">Upload tasks once. All students in <span className="font-bold text-indigo-600 uppercase">{batchId}</span> will see them.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCloudSync} disabled={isSyncing} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2 shadow-sm">
                            {isSyncing ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Sync
                        </button>
                        <button onClick={() => setIsCreating(true)} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-purple-700 shadow-md flex items-center gap-2">
                            <Plus size={20}/> Create New Task
                        </button>
                    </div>
                </div>

                {isCreating && (
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-purple-100 mb-8 animate-fade-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Create New Assessment Task</h3>
                        <form onSubmit={handleCreateTask} className="space-y-6 max-w-2xl">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Task Title</label>
                                <input className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" placeholder="e.g. End of Term Mock" value={newTitle} onChange={e=>setNewTitle(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                <select className="w-full border p-3 rounded-xl bg-white" value={newCategory} onChange={e=>setNewCategory(e.target.value)}>
                                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <label className="block text-xs font-bold text-blue-700 uppercase mb-2">1. Question Paper (PDF)</label>
                                    <input type="file" accept="application/pdf" onChange={e => setQpFile(e.target.files?.[0] || null)} className="w-full text-sm" required />
                                    <p className="text-[10px] text-blue-500 mt-1 font-bold">Visible to Students</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                    <label className="block text-xs font-bold text-green-700 uppercase mb-2">2. Marking Scheme (PDF/Img)</label>
                                    <input type="file" accept="application/pdf,image/*" onChange={e => setMsFile(e.target.files?.[0] || null)} className="w-full text-sm" required />
                                    <p className="text-[10px] text-green-500 mt-1 font-bold">Hidden (For AI Marking)</p>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancel</button>
                                <button type="submit" disabled={creatingStep !== 'IDLE'} className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 flex items-center gap-2 shadow-md disabled:opacity-50">
                                    {creatingStep !== 'IDLE' ? <Loader2 className="animate-spin" size={20}/> : <Plus size={20}/>}
                                    {creatingStep === 'UPLOADING' ? 'Uploading...' : creatingStep === 'SAVING' ? 'Syncing...' : 'Publish Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid gap-4">
                    {tasks.length > 0 ? tasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                    <FileCheck2 size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900">{task.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-bold uppercase">{task.category}</span>
                                        <span className="text-gray-400 text-xs">{new Date(task.dateCreated).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <a href={task.questionPaperUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg text-sm font-bold flex items-center gap-1" title="View Question Paper">
                                    <Download size={16}/> QP
                                </a>
                                <button onClick={() => handleDelete(task.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg hover:text-red-600 transition-colors" title="Delete Task">
                                    <Trash2 size={20}/>
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-400 font-bold">No tasks created for this batch yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BatchAssessmentTasks;
