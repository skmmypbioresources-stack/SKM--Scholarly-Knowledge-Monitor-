
import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, Curriculum, AssessmentTask } from '../types';
import { addAssessmentTask, getAssessmentTasks, removeAssessmentTask, saveAssessmentTasksList } from '../services/storageService';
import { analyzeScriptWithVisualMarkers, VisualMarking, AnalysisResult, QuestionBreakdown } from '../services/geminiService';
import { uploadFileToCloud, syncAssessmentTasks, getAssessmentTasksFromCloud, testConnection } from '../services/cloudService';
import { FileCheck2, Upload, FileText, Trash2, Download, Loader2, Target, Plus, X, RefreshCw, Brain, Check, X as XIcon, FileDown, Trophy, ChevronLeft, ChevronRight, Files, Info, Lightbulb, CheckCircle2, AlertCircle, TrendingUp, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ScriptPage {
    url: string;
    base64: string;
    mimeType: string;
    file: File;
}

const AssessmentTasks: React.FC = () => {
    const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
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
    const [isValidScript, setIsValidScript] = useState(true);
    const [validationMessage, setValidationMessage] = useState('');
    const [feedbackSummary, setFeedbackSummary] = useState('');
    const [questionAnalysis, setQuestionAnalysis] = useState<QuestionBreakdown[]>([]);
    const [markings, setMarkings] = useState<VisualMarking[]>([]);
    const [score, setScore] = useState<{achieved: number, total: number} | null>(null);
    const [strengths, setStrengths] = useState<string[]>([]);
    const [weaknesses, setWeaknesses] = useState<string[]>([]);
    const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

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
        const files: File[] = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newPages: ScriptPage[] = await Promise.all(files.map(async (f: File) => ({
            url: URL.createObjectURL(f),
            base64: await convertToBase64(f),
            mimeType: f.type,
            file: f
        })));

        setScriptPages(prev => [...prev, ...newPages]);
        resetResults();
    };

    const resetResults = () => {
        setFeedbackSummary('');
        setQuestionAnalysis([]);
        setMarkings([]);
        setScore(null);
        setStrengths([]);
        setWeaknesses([]);
        setIsValidScript(true);
        setValidationMessage('');
    };

    const closeChecker = () => {
        setSelectedTask(null);
        scriptPages.forEach(p => URL.revokeObjectURL(p.url));
        setScriptPages([]);
        resetResults();
        setActivePageIndex(0);
    };

    const handleCheckWork = async () => {
        if (!selectedTask || scriptPages.length === 0) return;
        setIsAnalyzing(true);
        resetResults();
        try {
            const payload = scriptPages.map(p => ({ base64: p.base64, mimeType: p.mimeType }));
            const result: AnalysisResult = await analyzeScriptWithVisualMarkers(
                payload, 
                `High-precision diagnostic for: ${selectedTask.title}. Count every question. Mark missing ones as 0.`,
                selectedTask.markingSchemeBase64,
                selectedTask.markingSchemeMimeType
            );
            
            setIsValidScript(result.isValidScript);
            if (!result.isValidScript) {
                setValidationMessage(result.validationMessage || 'Mismatched Script Detected');
            } else {
                setFeedbackSummary(result.feedbackSummary);
                setQuestionAnalysis(result.questionAnalysis);
                setMarkings(result.markings);
                setScore({ achieved: result.achievedMarks, total: result.totalMarks });
                setStrengths(result.strengths);
                setWeaknesses(result.weaknesses);
            }
        } catch (e) {
            setFeedbackSummary("Error analyzing script.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDownloadMarked = async () => {
        if (scriptPages.length === 0 || !canvasRef.current) return;
        setIsGeneratingDownload(true);

        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Load all images first using Promises to ensure they are ready
            const loadedImages = await Promise.all(scriptPages.map(page => {
                return new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = page.url;
                });
            }));

            // Determine dimensions for a single stacked output
            const maxWidth = Math.max(...loadedImages.map(img => img.naturalWidth));
            const totalHeight = loadedImages.reduce((sum, img) => sum + img.naturalHeight, 0);

            canvas.width = maxWidth;
            canvas.height = totalHeight;

            // Fill background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let currentY = 0;
            loadedImages.forEach((img, pageIdx) => {
                const xOffset = (maxWidth - img.naturalWidth) / 2;
                ctx.drawImage(img, xOffset, currentY);

                // Draw markings for this specific page
                const pageMarkings = markings.filter(m => m.page === pageIdx);
                pageMarkings.forEach(m => {
                    const drawX = (m.x / 1000) * img.naturalWidth + xOffset;
                    const drawY = (m.y / 1000) * img.naturalHeight + currentY;
                    
                    const markerSize = img.naturalWidth * 0.02; 
                    ctx.lineWidth = img.naturalWidth * 0.006;

                    if (m.type === 'tick') {
                        ctx.strokeStyle = '#22c55e';
                        ctx.beginPath();
                        ctx.moveTo(drawX - markerSize, drawY);
                        ctx.lineTo(drawX, drawY + markerSize);
                        ctx.lineTo(drawX + markerSize * 1.5, drawY - markerSize);
                        ctx.stroke();
                    } else {
                        ctx.strokeStyle = '#ef4444';
                        ctx.beginPath();
                        ctx.moveTo(drawX - markerSize, drawY - markerSize);
                        ctx.lineTo(drawX + markerSize, drawY + markerSize);
                        ctx.moveTo(drawX + markerSize, drawY - markerSize);
                        ctx.lineTo(drawX - markerSize, drawY + markerSize);
                        ctx.stroke();
                    }
                });

                currentY += img.naturalHeight;
            });

            // Trigger the download
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Marked_Script_${selectedTask?.title.replace(/\s+/g, '_') || 'Analysis'}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Download generation error:", err);
            alert("Could not generate download. Please try again after ensuring images are loaded.");
        } finally {
            setIsGeneratingDownload(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Assessment Tasks</h2>
                    <p className="text-gray-500 font-medium">Brisk AI Examiner with deep diagnostic and integrity verification.</p>
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
                            <button onClick={() => { setSelectedTask(task); setScriptPages([]); resetResults(); }} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 shadow-md"><Upload size={18}/> Upload & Check</button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedTask && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[1.5rem] w-full max-w-[95vw] h-[95vh] shadow-2xl flex flex-col overflow-hidden relative">
                         <div className="bg-indigo-600 text-white px-6 py-4 shrink-0 flex justify-between items-center shadow-lg z-20">
                             <div>
                                <h3 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tighter"><Target size={20}/> {selectedTask.title}</h3>
                                <p className="opacity-80 text-[10px] font-black tracking-widest uppercase">High-Precision Pedagogical Grader</p>
                             </div>
                             <button onClick={closeChecker} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"><X size={20}/></button>
                         </div>

                         <div className="flex-1 overflow-hidden flex flex-col md:flex-row h-full">
                             <div className="md:w-[45%] bg-gray-100 border-r border-gray-200 flex flex-col h-full relative">
                                <div className="p-3 border-b bg-white flex justify-between items-center shadow-sm z-10">
                                   <div className="flex items-center gap-4">
                                       <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2 uppercase tracking-tighter"><FileText size={16}/> Student Script</h4>
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
                                    {scriptPages.length > 0 ? (
                                        <div className="relative w-full h-full flex items-center justify-center overflow-auto p-4">
                                            <div className="relative inline-block shadow-2xl bg-white transition-all">
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
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div onClick={() => document.getElementById('main-upload')?.click()} className="text-center p-12 border-2 border-dashed border-gray-300 rounded-3xl m-8 hover:border-indigo-400 transition-colors bg-white cursor-pointer group shadow-sm">
                                            <input id="main-upload" type="file" accept="image/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
                                            <Files size={64} className="mx-auto text-gray-300 mb-6 group-hover:text-indigo-400 transition-colors"/>
                                            <p className="font-black text-gray-600 text-xl">Upload Entire Script</p>
                                            <p className="text-gray-400 mt-2 font-medium">Select all pages for precision diagnostic check</p>
                                        </div>
                                    )}
                                </div>
                             </div>

                             <div className="flex-1 bg-white flex flex-col h-full shadow-inner">
                                 <div className="p-3 border-b bg-gray-50 flex justify-between items-center shadow-sm shrink-0">
                                    <h4 className="font-bold text-indigo-800 text-sm flex items-center gap-2 uppercase tracking-widest"><Brain size={16}/> Professional Examiner Report</h4>
                                    {score && isValidScript && (
                                        <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full flex items-center gap-2 shadow-md animate-fade-in"><Trophy size={14}/><span className="text-sm font-black">{score.achieved} / {score.total} Marks</span></div>
                                    )}
                                 </div>

                                 <div className="flex-1 overflow-y-auto bg-slate-50/30">
                                     {!isValidScript ? (
                                         <div className="p-10 animate-fade-in">
                                             <div className="bg-red-50 border-2 border-dashed border-red-200 p-8 rounded-[2.5rem] text-center">
                                                 <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                                                     <ShieldAlert size={40} />
                                                 </div>
                                                 <h5 className="text-2xl font-black text-red-900 mb-4 uppercase tracking-tight">Integrity Mismatch Detected</h5>
                                                 <p className="text-red-700 font-bold leading-relaxed mb-6">"The AI Examiner has determined that the uploaded script does not match the marking scheme for: {selectedTask.title}."</p>
                                                 <div className="bg-white/50 p-4 rounded-2xl border border-red-100 mb-8">
                                                     <p className="text-sm text-red-600 font-medium italic">Reason: {validationMessage}</p>
                                                 </div>
                                                 <button onClick={() => setScriptPages([])} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-red-700 transition-all">Upload Correct Script</button>
                                             </div>
                                         </div>
                                     ) : questionAnalysis.length > 0 ? (
                                         <div className="p-6 space-y-8 pb-20">
                                             <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden">
                                                 <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle2 size={100} className="text-indigo-600"/></div>
                                                 <h5 className="font-black text-indigo-900 mb-3 flex items-center gap-2 uppercase text-xs tracking-wider relative z-10"><CheckCircle2 size={16} className="text-indigo-600"/> Executive Script Summary</h5>
                                                 <p className="text-gray-700 leading-relaxed font-medium italic relative z-10 text-base">"{feedbackSummary}"</p>
                                             </div>

                                             <div className="space-y-6">
                                                 <div className="flex items-center gap-3 px-1">
                                                     <div className="h-px flex-1 bg-gray-200"></div>
                                                     <h5 className="font-black text-gray-400 uppercase text-[10px] tracking-[0.3em]">Individual Question Diagnostics</h5>
                                                     <div className="h-px flex-1 bg-gray-200"></div>
                                                 </div>
                                                 {questionAnalysis.map((item, idx) => (
                                                     <div key={idx} className="bg-white rounded-[2rem] border border-gray-100 shadow-lg overflow-hidden animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                                                         <div className={`px-6 py-4 flex justify-between items-center border-b ${item.marksAwarded === item.maxMarks ? 'bg-green-50/30' : item.marksAwarded === 0 ? 'bg-red-50/30' : 'bg-orange-50/30'}`}>
                                                             <div className="flex items-center gap-3">
                                                                 <span className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black text-indigo-600 border border-indigo-50">{item.questionRef.replace(/\D/g, '') || idx + 1}</span>
                                                                 <span className="font-black text-indigo-900 text-xl">{item.questionRef}</span>
                                                             </div>
                                                             <div className={`px-4 py-1.5 rounded-full text-sm font-black border ${item.marksAwarded === item.maxMarks ? 'bg-green-100 text-green-700 border-green-200' : item.marksAwarded === 0 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                                                 {item.marksAwarded} / {item.maxMarks} Marks
                                                             </div>
                                                         </div>
                                                         <div className="p-6 space-y-6">
                                                             <div className="flex gap-4">
                                                                 <div className="p-2.5 bg-slate-100 rounded-2xl h-fit text-slate-500 shadow-inner"><Info size={20}/></div>
                                                                 <div className="flex-1">
                                                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Examiner Assessment</p>
                                                                     <p className="text-gray-800 text-lg font-medium leading-relaxed">{item.remark || "No specific feedback provided."}</p>
                                                                 </div>
                                                             </div>
                                                             <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-100 flex gap-4 transition-all hover:shadow-inner">
                                                                 <div className="p-2.5 bg-indigo-100 rounded-2xl h-fit text-indigo-600 shadow-sm"><Lightbulb size={20}/></div>
                                                                 <div className="flex-1">
                                                                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Teacher's Strategy Tip</p>
                                                                     <p className="text-indigo-900 text-base font-bold leading-relaxed">{item.improvementTip || "Attempt all parts of the question to secure maximum potential marks."}</p>
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>

                                             <div className="grid md:grid-cols-2 gap-6 pt-6">
                                                 <div className="bg-green-50/50 p-8 rounded-[2.5rem] border border-green-100 shadow-sm transition-all hover:shadow-md">
                                                     <h5 className="font-black text-green-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest"><TrendingUp size={20}/> Core Strengths</h5>
                                                     <ul className="space-y-3">
                                                         {strengths.map((s, i) => (
                                                             <li key={i} className="flex gap-3 text-green-900 font-bold text-sm bg-white/50 p-3 rounded-xl border border-green-100">
                                                                 <Check size={18} className="shrink-0 text-green-600"/> {s}
                                                             </li>
                                                         ))}
                                                         {strengths.length === 0 && <li className="text-gray-400 italic text-sm">Identifying mastery...</li>}
                                                     </ul>
                                                 </div>
                                                 <div className="bg-red-50/50 p-8 rounded-[2.5rem] border border-red-100 shadow-sm transition-all hover:shadow-md">
                                                     <h5 className="font-black text-red-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest"><AlertTriangle size={20}/> Improvement Focus</h5>
                                                     <ul className="space-y-3">
                                                         {weaknesses.map((w, i) => (
                                                             <li key={i} className="flex gap-3 text-red-900 font-bold text-sm bg-white/50 p-3 rounded-xl border border-red-100">
                                                                 <AlertCircle size={18} className="shrink-0 text-red-600"/> {w}
                                                             </li>
                                                         ))}
                                                         {weaknesses.length === 0 && <li className="text-gray-400 italic text-sm">Identifying areas for growth...</li>}
                                                     </ul>
                                                 </div>
                                             </div>
                                         </div>
                                     ) : (
                                         <div className="h-full flex flex-col items-center justify-center text-gray-300 p-12">
                                             {isAnalyzing ? (
                                                 <div className="text-center">
                                                     <div className="relative mb-10">
                                                         <Loader2 size={96} className="animate-spin text-indigo-500 mx-auto"/>
                                                         <RefreshCw size={40} className="text-indigo-300 absolute inset-0 m-auto animate-pulse" />
                                                     </div>
                                                     <p className="text-indigo-900 font-black animate-pulse uppercase tracking-[0.3em] text-sm mb-3">Precision Grader Active...</p>
                                                     <p className="text-gray-400 text-xs font-bold max-w-xs mx-auto uppercase tracking-tighter text-center">Identifying all questions from scheme and verifying script completion... typically finishes in &lt; 60s</p>
                                                 </div>
                                             ) : (
                                                <div className="text-center">
                                                    <div className="bg-white p-10 rounded-full inline-block shadow-2xl border border-gray-50 mb-8 transform hover:scale-110 transition-transform">
                                                        <Target size={80} className="opacity-20 text-indigo-600"/>
                                                    </div>
                                                    <p className="text-2xl font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Examiner Ready</p>
                                                    <p className="text-sm text-gray-400 font-bold max-w-xs mx-auto">Upload your full script. Every single question number in the marking scheme will be accounted for.</p>
                                                </div>
                                             )}
                                         </div>
                                     )}
                                 </div>

                                 <div className="p-5 border-t border-gray-100 bg-white space-y-4 shadow-2xl relative z-10">
                                     {questionAnalysis.length > 0 && isValidScript && (
                                         <button onClick={handleDownloadMarked} disabled={isGeneratingDownload} className="w-full py-4 rounded-2xl font-black shadow-md transition-all flex justify-center items-center gap-3 text-lg border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 group transform active:scale-95">
                                             {isGeneratingDownload ? <Loader2 className="animate-spin" size={24}/> : <FileDown size={24} className="group-hover:-translate-y-1 transition-transform"/>}
                                             Export Marked Script PNG
                                         </button>
                                     )}
                                     <button onClick={handleCheckWork} disabled={scriptPages.length === 0 || isAnalyzing} className={`w-full py-4 rounded-2xl font-black shadow-xl transition-all flex justify-center items-center gap-3 text-xl transform active:scale-[0.98] ${isAnalyzing ? 'bg-slate-100 text-slate-400' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                         {isAnalyzing ? <Loader2 className="animate-spin" size={24}/> : <FileCheck2 size={24}/>} 
                                         {questionAnalysis.length > 0 ? "Re-Analyze With Precision" : "Start Precision Line-by-Line Marking"}
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
