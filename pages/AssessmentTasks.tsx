
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, Curriculum, AssessmentTask } from '../types';
import { addAssessmentTask, getAssessmentTasks, removeAssessmentTask, saveAssessmentTasksList } from '../services/storageService';
import { analyzeAnswerScript } from '../services/geminiService';
import { uploadFileToCloud, syncAssessmentTasks, getAssessmentTasksFromCloud, testConnection } from '../services/cloudService';
import { FileCheck2, Upload, FileText, Trash2, Download, Loader2, Target, Plus, X, RefreshCw, Brain } from 'lucide-react';

const AssessmentTasks: React.FC = () => {
    const { student, isReadOnly } = useOutletContext<{ student: Student, isReadOnly: boolean }>();
    const isIGCSE = student.curriculum === Curriculum.IGCSE;
    
    const [tasks, setTasks] = useState<AssessmentTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState<string>(isIGCSE ? 'AO1' : 'CritA');
    const [qpFile, setQpFile] = useState<File | null>(null);
    const [msFile, setMsFile] = useState<File | null>(null);
    const [creatingStep, setCreatingStep] = useState<'IDLE' | 'UPLOADING' | 'SAVING'>('IDLE');

    const [selectedTask, setSelectedTask] = useState<AssessmentTask | null>(null);
    const [answerFile, setAnswerFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [feedback, setFeedback] = useState('');

    const activeTabStyle = "border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50";
    const [activeTab, setActiveTab] = useState(isIGCSE ? 'AO1' : 'CritA');

    const CATEGORIES_IGCSE = [
        { id: 'AO1', label: 'AO1: Knowledge' },
        { id: 'AO2', label: 'AO2: Problem Solving' },
        { id: 'AO3', label: 'AO3: Experimental' }
    ];
    const CATEGORIES_MYP = [
        { id: 'CritA', label: 'Crit A: Knowing' },
        { id: 'CritB', label: 'Crit B: Inquiring' },
        { id: 'CritC', label: 'Crit C: Processing' },
        { id: 'CritD', label: 'Crit D: Reflecting' }
    ];

    const currentCategories = isIGCSE ? CATEGORIES_IGCSE : CATEGORIES_MYP;

    useEffect(() => {
        loadTasks();
        if (!isReadOnly) {
            handleStudentSync();
        }
    }, [student.batch]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const loadTasks = async () => {
        setLoading(true);
        const t = await getAssessmentTasks(student.batch);
        setTasks(t.sort((a,b) => b.dateCreated - a.dateCreated));
        setLoading(false);
    };

    const handleStudentSync = async () => {
        setIsSyncing(true);
        try {
            const connected = await testConnection();
            if (connected) {
                const res = await getAssessmentTasksFromCloud(student.batch);
                if (res.result === 'success' && res.data) {
                    await saveAssessmentTasksList(res.data);
                    await loadTasks();
                }
            }
        } catch (e) {
            console.error("Auto sync failed", e);
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setAnswerFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setFeedback('');
        }
    };

    const closeChecker = () => {
        setSelectedTask(null);
        setAnswerFile(null);
        setFeedback('');
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !qpFile || !msFile) return alert("Please fill all fields.");
        setCreatingStep('UPLOADING');
        try {
            const qpBase64 = await convertToBase64(qpFile);
            const qpRes = await uploadFileToCloud(qpBase64, `QP_${student.batch}_${newCategory}_${newTitle}.pdf`, qpFile.type);
            if(qpRes.result !== 'success') throw new Error("QP Upload Failed: " + qpRes.error);
            const msBase64 = await convertToBase64(msFile);
            const newTask: AssessmentTask = {
                id: Date.now().toString(),
                batchId: student.batch,
                curriculum: student.curriculum,
                category: newCategory as any,
                title: newTitle,
                questionPaperUrl: qpRes.data.url,
                markingSchemeBase64: msBase64,
                markingSchemeMimeType: msFile.type,
                dateCreated: Date.now()
            };
            setCreatingStep('SAVING');
            await addAssessmentTask(newTask);
            const allTasks = await getAssessmentTasks(student.batch);
            await syncAssessmentTasks(student.batch, allTasks);
            await loadTasks();
            setIsCreating(false);
            setNewTitle(''); setQpFile(null); setMsFile(null);
            alert("Task Created & Synced Successfully!");
        } catch (e: any) {
            alert(e.message);
        } finally {
            setCreatingStep('IDLE');
        }
    };

    const handleDeleteTask = async (id: string) => {
        if(!confirm("Delete this task?")) return;
        await removeAssessmentTask(id);
        const remainingTasks = await getAssessmentTasks(student.batch);
        await syncAssessmentTasks(student.batch, remainingTasks);
        loadTasks();
    };

    const handleCheckWork = async () => {
        if (!selectedTask || !answerFile) return;
        setIsAnalyzing(true);
        try {
            const ansBase64 = await convertToBase64(answerFile);
            const result = await analyzeAnswerScript(
                ansBase64, 
                answerFile.type, 
                `Check this answer script against the provided Marking Scheme for the task: ${selectedTask.title}.`,
                selectedTask.markingSchemeBase64,
                selectedTask.markingSchemeMimeType
            );
            setFeedback(result);
        } catch (e) {
            setFeedback("Error analyzing. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Assessment Tasks</h2>
                    <p className="text-gray-500">Download papers, write answers, and get instant AI marking.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleStudentSync} disabled={isSyncing} className="bg-white border border-gray-200 text-gray-600 px-4 py-3 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2 shadow-sm">
                        {isSyncing ? <Loader2 className="animate-spin" size={20}/> : <RefreshCw size={20}/>} Sync List
                    </button>
                    {isReadOnly && (
                        <button onClick={() => setIsCreating(true)} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg">
                            <Plus size={20}/> Create New Task
                        </button>
                    )}
                </div>
            </div>

            <div className="flex overflow-x-auto gap-2 pb-2 border-b border-gray-200">
                {currentCategories.map(cat => (
                    <button 
                        key={cat.id} 
                        onClick={() => setActiveTab(cat.id)}
                        className={`px-6 py-4 rounded-t-2xl font-bold text-lg whitespace-nowrap transition-all ${activeTab === cat.id ? activeTabStyle : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.filter(t => t.category === activeTab).map(task => (
                    <div key={task.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{task.title}</h3>
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {new Date(task.dateCreated).toLocaleDateString()}
                            </span>
                        </div>
                        
                        <div className="mt-6 space-y-3">
                            <a 
                                href={task.questionPaperUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="block w-full text-center py-3 rounded-xl border-2 border-indigo-100 text-indigo-700 font-bold hover:bg-indigo-50 transition-colors flex justify-center items-center gap-2"
                            >
                                <Download size={18}/> Download Paper
                            </a>
                            <button 
                                onClick={() => { setSelectedTask(task); setFeedback(''); setAnswerFile(null); setPreviewUrl(null); }}
                                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 shadow-md"
                            >
                                <Upload size={18}/> Upload & Check
                            </button>
                            {isReadOnly && (
                                <button onClick={() => handleDeleteTask(task.id)} className="w-full py-2 text-red-400 hover:text-red-600 text-xs font-bold">
                                    Delete Task
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                
                {tasks.filter(t => t.category === activeTab).length === 0 && (
                    <div className="col-span-full py-16 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                        <FileCheck2 size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>No tasks assigned for this category yet.</p>
                        {!isReadOnly && <p className="text-xs mt-2">Click "Sync List" if you expect to see tasks.</p>}
                    </div>
                )}
            </div>

            {isCreating && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">New Assessment Task</h3>
                            <button onClick={() => setIsCreating(false)}><X className="text-gray-400"/></button>
                        </div>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Task Title</label>
                                <input className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Cells Test 1" value={newTitle} onChange={e=>setNewTitle(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                <select className="w-full border p-3 rounded-xl bg-white" value={newCategory} onChange={e=>setNewCategory(e.target.value)}>
                                    {currentCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <label className="block text-xs font-bold text-blue-700 uppercase mb-2">1. Question Paper (PDF)</label>
                                <input type="file" accept="application/pdf" onChange={e => setQpFile(e.target.files?.[0] || null)} className="w-full text-sm" required />
                                <p className="text-[10px] text-blue-500 mt-1">*Students will download this.</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                <label className="block text-xs font-bold text-green-700 uppercase mb-2">2. Marking Scheme (PDF/Image)</label>
                                <input type="file" accept="application/pdf,image/*" onChange={e => setMsFile(e.target.files?.[0] || null)} className="w-full text-sm" required />
                                <p className="text-[10px] text-green-500 mt-1">*Hidden from students. Used by AI to correct.</p>
                            </div>

                            <button type="submit" disabled={creatingStep !== 'IDLE'} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-4 flex justify-center items-center gap-2">
                                {creatingStep !== 'IDLE' ? <Loader2 className="animate-spin"/> : <Plus size={20}/>}
                                {creatingStep === 'UPLOADING' ? 'Uploading to Drive...' : creatingStep === 'SAVING' ? 'Saving & Syncing...' : 'Create Task'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {selectedTask && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[1.5rem] w-full max-w-[95vw] h-[95vh] shadow-2xl flex flex-col overflow-hidden relative">
                         <div className="bg-indigo-600 text-white px-6 py-4 shrink-0 flex justify-between items-center">
                             <div>
                                <h3 className="text-xl font-bold flex items-center gap-2"><Target size={20}/> {selectedTask.title}</h3>
                                <p className="opacity-80 text-xs">AI Marking Assistant</p>
                             </div>
                             <button onClick={closeChecker} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"><X size={20}/></button>
                         </div>

                         <div className="flex-1 overflow-hidden flex flex-col md:flex-row h-full">
                             <div className="md:w-1/2 bg-gray-100 border-r border-gray-200 flex flex-col h-full relative">
                                <div className="p-3 border-b bg-white flex justify-between items-center shadow-sm z-10">
                                   <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                      <FileText size={16}/> Student Answer Script
                                   </h4>
                                   {answerFile && (
                                       <label className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold cursor-pointer hover:bg-indigo-100 transition-colors">
                                           Change File
                                           <input type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                                       </label>
                                   )}
                                </div>

                                <div className="flex-1 overflow-hidden bg-gray-200/50 flex items-center justify-center relative">
                                    {previewUrl ? (
                                        answerFile?.type === 'application/pdf' ? (
                                            <iframe 
                                                src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH&scrollbar=0`} 
                                                className="w-full h-full border-none"
                                                title="PDF Preview"
                                            />
                                        ) : (
                                            <div className="overflow-auto w-full h-full flex items-center justify-center">
                                                <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain p-4 shadow-lg bg-white" />
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-xl m-8 hover:border-indigo-400 transition-colors bg-white cursor-pointer relative">
                                            <input type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <Upload size={48} className="mx-auto text-gray-300 mb-4"/>
                                            <p className="font-bold text-gray-600 text-lg">Upload Answer Script</p>
                                            <p className="text-sm text-gray-400 mt-1">PDF or Image</p>
                                        </div>
                                    )}
                                </div>
                             </div>

                             <div className="md:w-1/2 bg-white flex flex-col h-full">
                                 <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                                    <h4 className="font-bold text-indigo-800 text-sm flex items-center gap-2">
                                        <Brain size={16}/> Examiner Feedback
                                    </h4>
                                    {feedback && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Analysis Complete</span>}
                                 </div>

                                 <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                     {feedback ? (
                                         <div className="prose prose-sm prose-indigo max-w-none">
                                             <div className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed text-base">
                                                 {feedback}
                                             </div>
                                         </div>
                                     ) : (
                                         <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                                             {isAnalyzing ? (
                                                 <>
                                                     <Loader2 size={48} className="animate-spin text-indigo-500"/>
                                                     <p className="text-indigo-900 font-bold animate-pulse">Examiner is checking your work...</p>
                                                 </>
                                             ) : (
                                                <>
                                                    <Target size={64} className="opacity-20"/>
                                                    <div className="text-center">
                                                        <p className="text-lg font-bold text-gray-400">Ready to Mark</p>
                                                        <p className="text-sm">Upload your script on the left to begin.</p>
                                                    </div>
                                                </>
                                             )}
                                         </div>
                                     )}
                                 </div>

                                 <div className="p-4 border-t border-gray-100 bg-white">
                                     <button 
                                         onClick={handleCheckWork}
                                         disabled={!answerFile || isAnalyzing}
                                         className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center gap-3 text-lg ${
                                             isAnalyzing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 hover:scale-[1.01]'
                                         }`}
                                     >
                                         {isAnalyzing ? <Loader2 className="animate-spin" size={24}/> : <FileCheck2 size={24}/>} 
                                         {isAnalyzing ? "Marking in Progress..." : feedback ? "Re-Check Work" : "Mark My Work"}
                                     </button>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentTasks;
