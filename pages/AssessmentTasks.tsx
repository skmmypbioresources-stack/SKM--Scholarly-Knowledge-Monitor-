
import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, Curriculum, AssessmentTask } from '../types';
import { addAssessmentTask, getAssessmentTasks, removeAssessmentTask, saveAssessmentTasksList } from '../services/storageService';
import { analyzeScriptWithVisualMarkers, VisualMarking, AnalysisResult } from '../services/geminiService';
import { uploadFileToCloud, syncAssessmentTasks, getAssessmentTasksFromCloud, testConnection } from '../services/cloudService';
import { FileCheck2, Upload, FileText, Trash2, Download, Loader2, Target, Plus, X, RefreshCw, Brain, Check, X as XIcon, FileDown, Trophy, ChevronLeft, ChevronRight, Files } from 'lucide-react';

interface ScriptPage {
    url: string;
    base64: string;
    mimeType: string;
    file: File;
}

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
    const [scriptPages, setScriptPages] = useState<ScriptPage[]>([]);
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [markings, setMarkings] = useState<VisualMarking[]>([]);
    const [score, setScore] = useState<{achieved: number, total: number} | null>(null);
    const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRefs = useRef<(HTMLImageElement | null)[]>([]);

    const activeTabStyle = "border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50";
    const [activeTab, setActiveTab] = useState(isIGCSE ? 'AO1' : 'CritA');

    const currentCategories = isIGCSE ? [
        { id: 'AO1', label: 'AO1: Knowledge' },
        { id: 'AO2', label: 'AO2: Problem Solving' },
        { id: 'AO3', label: 'AO3: Experimental' }
    ] : [
        { id: 'CritA', label: 'Crit A: Knowing' },
        { id: 'CritB', label: 'Crit B: Inquiring' },
        { id: 'CritC', label: 'Crit C: Processing' },
        { id: 'CritD', label: 'Crit D: Reflecting' }
    ];

    useEffect(() => {
        loadTasks();
        if (!isReadOnly) handleStudentSync();
    }, [student.batch]);

    useEffect(() => {
        return () => scriptPages.forEach(p => URL.revokeObjectURL(p.url));
    }, [scriptPages]);

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
        } catch (e) { console.error("Auto sync failed", e); }
        finally { setIsSyncing(false); }
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Fix: Explicitly type files as File[] to prevent type inference issues with FileList in some TS environments
        const files: File[] = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newPages: ScriptPage[] = await Promise.all(files.map(async (f: File) => ({
            url: URL.createObjectURL(f),
            base64: await convertToBase64(f),
            mimeType: f.type,
            file: f
        })));

        setScriptPages(prev => [...prev, ...newPages]);
        setFeedback('');
        setMarkings([]);
        setScore(null);
    };

    const closeChecker = () => {
        setSelectedTask(null);
        scriptPages.forEach(p => URL.revokeObjectURL(p.url));
        setScriptPages([]);
        setFeedback('');
        setMarkings([]);
        setScore(null);
        setActivePageIndex(0);
    };

    const handleCheckWork = async () => {
        if (!selectedTask || scriptPages.length === 0) return;
        setIsAnalyzing(true);
        setFeedback('');
        setMarkings([]);
        setScore(null);
        try {
            const payload = scriptPages.map(p => ({ base64: p.base64, mimeType: p.mimeType }));
            const result: AnalysisResult = await analyzeScriptWithVisualMarkers(
                payload, 
                `Grade this multi-page answer script for task: ${selectedTask.title}.`,
                selectedTask.markingSchemeBase64,
                selectedTask.markingSchemeMimeType
            );
            setFeedback(result.feedback);
            setMarkings(result.markings);
            setScore({ achieved: result.achievedMarks, total: result.totalMarks });
        } catch (e) {
            setFeedback("Error analyzing multi-page script. Ensure all files are clear.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDownloadMarked = async () => {
        if (!markings.length || scriptPages.length === 0 || !canvasRef.current) return;
        setIsGeneratingDownload(true);
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate total height of all pages
        const firstImg = imgRefs.current[0];
        if (!firstImg) return;
        
        const pageW = firstImg.naturalWidth || 1200;
        const pageH = firstImg.naturalHeight || 1600;
        
        canvas.width = pageW;
        canvas.height = pageH * scriptPages.length;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < scriptPages.length; i++) {
            const img = imgRefs.current[i];
            if (!img) continue;

            const yOffset = i * pageH;
            ctx.drawImage(img, 0, yOffset, pageW, pageH);

            // Draw marks for THIS page
            const pageMarkings = markings.filter(m => m.page === i);
            pageMarkings.forEach(m => {
                const pxX = (m.x / 1000) * pageW;
                const pxY = ((m.y / 1000) * pageH) + yOffset;

                ctx.lineWidth = pageW * 0.006;
                ctx.shadowBlur = 5;
                ctx.shadowColor = 'rgba(0,0,0,0.4)';

                if (m.type === 'tick') {
                    ctx.strokeStyle = '#22c55e';
                    ctx.beginPath();
                    ctx.moveTo(pxX - 15, pxY);
                    ctx.lineTo(pxX, pxY + 15);
                    ctx.lineTo(pxX + 25, pxY - 20);
                    ctx.stroke();
                } else {
                    ctx.strokeStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.moveTo(pxX - 15, pxY - 15);
                    ctx.lineTo(pxX + 15, pxY + 15);
                    ctx.moveTo(pxX + 15, pxY - 15);
                    ctx.lineTo(pxX - 15, pxY + 15);
                    ctx.stroke();
                }

                ctx.shadowBlur = 0;
                const fontSize = pageW * 0.015;
                ctx.font = `bold ${fontSize}px sans-serif`;
                const textWidth = ctx.measureText(m.comment).width;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(pxX + 30, pxY - (fontSize/2) - 10, textWidth + 20, fontSize + 20);
                ctx.fillStyle = m.type === 'tick' ? '#166534' : '#991b1b';
                ctx.fillText(m.comment, pxX + 40, pxY + (fontSize/4));
            });
        }

        // Final score stamp on page 1
        if (score) {
            const stampWidth = pageW * 0.25;
            const stampHeight = pageW * 0.12;
            ctx.fillStyle = '#4f46e5';
            ctx.fillRect(pageW - stampWidth - 40, 40, stampWidth, stampHeight);
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = `bold ${pageW * 0.025}px sans-serif`;
            ctx.fillText("FINAL SCORE", pageW - (stampWidth/2) - 40, 40 + (stampHeight * 0.35));
            ctx.font = `black ${pageW * 0.045}px sans-serif`;
            ctx.fillText(`${score.achieved} / ${score.total}`, pageW - (stampWidth/2) - 40, 40 + (stampHeight * 0.8));
        }

        const link = document.createElement('a');
        link.download = `Marked_Paper_${selectedTask?.title}_${student.name}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setIsGeneratingDownload(false);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Assessment Tasks</h2>
                    <p className="text-gray-500">Upload multiple script pages for professional AI marking.</p>
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
                    <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`px-6 py-4 rounded-t-2xl font-bold text-lg whitespace-nowrap transition-all ${activeTab === cat.id ? activeTabStyle : 'text-gray-500 hover:bg-gray-50'}`}>{cat.label}</button>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {tasks.filter(t => t.category === activeTab).map(task => (
                    <div key={task.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{task.title}</h3>
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{new Date(task.dateCreated).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-6 space-y-3">
                            <a href={task.questionPaperUrl} target="_blank" rel="noreferrer" className="block w-full text-center py-3 rounded-xl border-2 border-indigo-100 text-indigo-700 font-bold hover:bg-indigo-50 transition-colors flex justify-center items-center gap-2"><Download size={18}/> Download Paper</a>
                            <button onClick={() => { setSelectedTask(task); setScriptPages([]); setMarkings([]); setScore(null); }} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 shadow-md"><Upload size={18}/> Upload & Check</button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedTask && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[1.5rem] w-full max-w-[95vw] h-[95vh] shadow-2xl flex flex-col overflow-hidden relative">
                         <div className="bg-indigo-600 text-white px-6 py-4 shrink-0 flex justify-between items-center">
                             <div>
                                <h3 className="text-xl font-bold flex items-center gap-2"><Target size={20}/> {selectedTask.title}</h3>
                                <p className="opacity-80 text-xs">AI Examiner (Multi-Page Marking System)</p>
                             </div>
                             <button onClick={closeChecker} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"><X size={20}/></button>
                         </div>

                         <div className="flex-1 overflow-hidden flex flex-col md:flex-row h-full">
                             <div className="md:w-1/2 bg-gray-100 border-r border-gray-200 flex flex-col h-full relative">
                                <div className="p-3 border-b bg-white flex justify-between items-center shadow-sm z-10">
                                   <div className="flex items-center gap-4">
                                       <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FileText size={16}/> Student Script</h4>
                                       {scriptPages.length > 0 && (
                                           <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg">
                                               <button onClick={() => setActivePageIndex(Math.max(0, activePageIndex-1))} className="text-gray-500 hover:text-indigo-600 disabled:opacity-30" disabled={activePageIndex===0}><ChevronLeft size={16}/></button>
                                               <span className="text-[10px] font-black uppercase text-gray-500">Page {activePageIndex + 1} of {scriptPages.length}</span>
                                               <button onClick={() => setActivePageIndex(Math.min(scriptPages.length-1, activePageIndex+1))} className="text-gray-500 hover:text-indigo-600 disabled:opacity-30" disabled={activePageIndex===scriptPages.length-1}><ChevronRight size={16}/></button>
                                           </div>
                                       )}
                                   </div>
                                   <label className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold cursor-pointer hover:bg-indigo-100">
                                       Add Pages
                                       <input type="file" accept="image/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
                                   </label>
                                </div>

                                <div className="flex-1 overflow-hidden bg-gray-200/50 flex items-center justify-center relative">
                                    <canvas ref={canvasRef} className="hidden" />
                                    {/* Pre-render all images hidden for compositor */}
                                    <div className="hidden">
                                        {scriptPages.map((p, idx) => (
                                            <img key={idx} ref={el => imgRefs.current[idx] = el} src={p.url} alt="Hidden Preload" />
                                        ))}
                                    </div>

                                    {scriptPages.length > 0 ? (
                                        <div className="relative w-full h-full flex items-center justify-center overflow-auto p-4">
                                            <div className="relative inline-block shadow-2xl bg-white">
                                                {scriptPages[activePageIndex].mimeType === 'application/pdf' ? (
                                                    <object data={scriptPages[activePageIndex].url} type="application/pdf" className="w-[600px] h-[800px] border-none"><p>PDF View</p></object>
                                                ) : (
                                                    <img src={scriptPages[activePageIndex].url} alt="Active Page" className="max-w-full max-h-full object-contain" />
                                                )}
                                                <div className="absolute inset-0 pointer-events-none">
                                                    {markings.filter(m => m.page === activePageIndex).map((m, idx) => (
                                                        <div key={idx} className="absolute group pointer-events-auto" style={{ top: `${m.y / 10}%`, left: `${m.x / 10}%`, transform: 'translate(-50%, -50%)' }}>
                                                            {m.type === 'tick' ? (
                                                                <div className="bg-green-500 text-white rounded-full p-1 shadow-lg ring-2 ring-white border border-green-700"><Check size={18} strokeWidth={4} /></div>
                                                            ) : (
                                                                <div className="bg-red-500 text-white rounded-full p-1 shadow-lg ring-2 ring-white border border-red-700"><XIcon size={18} strokeWidth={4} /></div>
                                                            )}
                                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                                                                <p className="font-bold uppercase mb-1 text-gray-400">{m.type === 'tick' ? 'Correct' : 'Incorrect'}</p>
                                                                {m.comment}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div onClick={() => document.getElementById('main-upload')?.click()} className="text-center p-8 border-2 border-dashed border-gray-300 rounded-xl m-8 hover:border-indigo-400 transition-colors bg-white cursor-pointer group">
                                            <input id="main-upload" type="file" accept="image/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
                                            <Files size={48} className="mx-auto text-gray-300 mb-4 group-hover:text-indigo-400"/>
                                            <p className="font-bold text-gray-600 text-lg">Upload Entire Script</p>
                                            <p className="text-sm text-gray-400 mt-1">Select all photos of your work</p>
                                        </div>
                                    )}
                                </div>
                             </div>

                             <div className="md:w-1/2 bg-white flex flex-col h-full">
                                 <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                                    <h4 className="font-bold text-indigo-800 text-sm flex items-center gap-2"><Brain size={16}/> IB Examiner Report</h4>
                                    {score && (
                                        <div className="flex items-center gap-2 animate-fade-in">
                                            <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg flex items-center gap-2 shadow-sm"><Trophy size={14}/><span className="text-sm font-black">{score.achieved} / {score.total} Marks</span></div>
                                            <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-1 rounded">STRICT MODE</span>
                                        </div>
                                    )}
                                 </div>

                                 <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/20">
                                     {feedback ? (
                                         <div className="prose prose-sm prose-indigo max-w-none"><div className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed text-base">{feedback}</div></div>
                                     ) : (
                                         <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                                             {isAnalyzing ? (
                                                 <div className="text-center">
                                                     <div className="relative mb-4">
                                                         <Loader2 size={64} className="animate-spin text-indigo-500 mx-auto"/>
                                                         <Brain size={24} className="text-indigo-300 absolute inset-0 m-auto" />
                                                     </div>
                                                     <p className="text-indigo-900 font-black animate-pulse uppercase tracking-widest">Marking Multi-Page Script...</p>
                                                 </div>
                                             ) : (
                                                <div className="text-center"><Target size={64} className="opacity-20 mx-auto mb-4"/><p className="text-lg font-bold text-gray-400">Ready to Mark</p><p className="text-sm">Upload all script pages to begin.</p></div>
                                             )}
                                         </div>
                                     )}
                                 </div>

                                 <div className="p-4 border-t border-gray-100 bg-white space-y-3">
                                     {feedback && (
                                         <button onClick={handleDownloadMarked} disabled={isGeneratingDownload} className="w-full py-4 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center gap-3 text-lg border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                                             {isGeneratingDownload ? <Loader2 className="animate-spin" size={24}/> : <FileDown size={24}/>}
                                             Download Full Marked Script
                                         </button>
                                     )}
                                     <button onClick={handleCheckWork} disabled={scriptPages.length === 0 || isAnalyzing} className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center gap-3 text-lg ${isAnalyzing ? 'bg-gray-100 text-gray-400' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                         {isAnalyzing ? <Loader2 className="animate-spin" size={24}/> : <FileCheck2 size={24}/>} 
                                         {feedback ? "Re-Mark Full Script" : "Mark Full Script (Multi-Page)"}
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
