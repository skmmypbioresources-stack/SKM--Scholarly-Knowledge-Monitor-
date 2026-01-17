import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student } from '../types';
import { analyzeAnswerScript } from '../services/geminiService';
import { FileUp, Sparkles, Upload, Download, X, Loader2, FileText, CheckCircle, Brain, FlaskConical, Target } from 'lucide-react';

const TasksAO: React.FC = () => {
    const { student } = useOutletContext<{ student: Student }>();
    
    // UI States
    const [selectedAO, setSelectedAO] = useState<{id: string, title: string, desc: string, fullContext: string} | null>(null);
    const [isCheckerOpen, setIsCheckerOpen] = useState(false);
    
    // File/Analysis States
    const [checkerFile, setCheckerFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [userContext, setUserContext] = useState('');

    const AOS = [
        {
            id: 'AO1',
            title: 'AO1: Knowledge with Understanding',
            shortDesc: 'Recall definitions, concepts, and facts.',
            fullContext: 'You are an examiner checking for AO1 (Knowledge with Understanding). The student must demonstrate knowledge of scientific phenomena, facts, laws, definitions, concepts, and theories. Check for correct terminology, units, and conventions.',
            icon: Brain,
            color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400'
        },
        {
            id: 'AO2',
            title: 'AO2: Handling Information & Problem Solving',
            shortDesc: 'Calculate, interpret data, and solve problems.',
            fullContext: 'You are an examiner checking for AO2 (Handling Information and Problem Solving). The student must locate, select, organize information, translate data (e.g., table to graph), manipulate numerical data, identify patterns, and solve quantitative problems. Check their logic and calculations.',
            icon: Target,
            color: 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400'
        },
        {
            id: 'AO3',
            title: 'AO3: Experimental Skills & Investigations',
            shortDesc: 'Plan experiments, evaluate methods, safety.',
            fullContext: 'You are an examiner checking for AO3 (Experimental Skills and Investigations). The student must demonstrate knowledge of safety techniques, apparatus use, planning experiments, making observations, interpreting experimental data, and suggesting improvements. Focus on the validity and reliability of their method.',
            icon: FlaskConical,
            color: 'bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-400'
        }
    ];

    const handleSelectAO = (ao: typeof AOS[0]) => {
        setSelectedAO(ao);
        setIsCheckerOpen(true);
        setAnalysisResult('');
        setCheckerFile(null);
        setUserContext('');
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setCheckerFile(e.target.files[0]);
    };

    const handleAnalyzeScript = async () => {
        if (!checkerFile || !selectedAO) return;
        setIsAnalyzing(true);
        try {
            const base64 = await convertFileToBase64(checkerFile);
            const prompt = `
                ${selectedAO.fullContext}
                
                Additional Context from Student: "${userContext}"
                
                Please grade this work based on the criteria above.
            `;
            const result = await analyzeAnswerScript(base64, checkerFile.type, prompt);
            setAnalysisResult(result);
        } catch (e) {
            setAnalysisResult("Error analyzing file.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDownloadFeedback = () => {
        const blob = new Blob([analysisResult], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SKM_Feedback_${selectedAO?.id}.txt`;
        document.body.appendChild(a);
        a.click();
    };

    return (
        <div className="space-y-10 max-w-7xl mx-auto">
            <div className="text-center md:text-left">
                <h2 className="text-4xl font-extrabold text-gray-900 mb-3">Assessment Tasks (AO)</h2>
                <p className="text-xl text-gray-500">Upload your work to demonstrate mastery of the 3 Assessment Objectives.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {AOS.map(ao => {
                    const Icon = ao.icon;
                    return (
                        <div 
                            key={ao.id} 
                            onClick={() => handleSelectAO(ao)}
                            className={`relative group cursor-pointer rounded-[2rem] p-8 border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${ao.color} bg-white flex flex-col items-center text-center h-full`}
                        >
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm ${ao.color.replace('bg-white', '').split(' ')[0]}`}>
                                <Icon size={40} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">{ao.title}</h3>
                            <p className="text-base opacity-80 mb-8 flex-1">{ao.shortDesc}</p>
                            
                            <button className="w-full py-3 rounded-xl bg-white border-2 border-current font-bold flex items-center justify-center gap-2 group-hover:bg-current group-hover:text-white transition-all">
                                <Upload size={20}/> Upload Task
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* --- AI CHECKER MODAL --- */}
            {isCheckerOpen && selectedAO && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Header */}
                        <div className={`p-6 flex justify-between items-center text-white ${selectedAO.color.split(' ')[0].replace('bg-', 'bg-').replace('-50', '-600')}`}>
                            <div className="flex items-center gap-3">
                                <selectedAO.icon size={28} />
                                <div>
                                    <h3 className="text-xl font-bold">{selectedAO.title} Checker</h3>
                                    <p className="text-xs opacity-90">AI Examiner Mode Active</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCheckerOpen(false)} className="hover:bg-white/20 p-2 rounded-full"><X size={24}/></button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 bg-gray-50">
                            {!analysisResult ? (
                                <div className="space-y-8">
                                    <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors text-center cursor-pointer relative group">
                                        <input type="file" accept="image/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileSelect}/>
                                        <div className="flex flex-col items-center">
                                            <div className="bg-indigo-50 p-4 rounded-full text-indigo-500 mb-4 group-hover:scale-110 transition-transform">
                                                <Upload size={32}/>
                                            </div>
                                            <p className="text-lg font-bold text-gray-700">Drop your answer script here</p>
                                            <p className="text-sm text-gray-400">PDF or Image</p>
                                            {checkerFile && (
                                                <div className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold flex items-center gap-2">
                                                    <FileText size={16}/> {checkerFile.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-600 uppercase mb-2">Task Details / Question</label>
                                        <textarea 
                                            className="w-full p-4 border rounded-xl h-32 outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-base bg-white"
                                            placeholder={`Paste the question or describe the task here so the AI knows what to check for ${selectedAO.id}...`}
                                            value={userContext}
                                            onChange={e => setUserContext(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 whitespace-pre-wrap font-mono text-sm leading-relaxed h-full overflow-y-auto">
                                    {analysisResult}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100">
                            {!analysisResult ? (
                                <button 
                                    onClick={handleAnalyzeScript} 
                                    disabled={!checkerFile || isAnalyzing} 
                                    className={`w-full text-white font-bold py-4 rounded-xl flex justify-center items-center gap-3 text-lg shadow-lg transition-transform active:scale-95 ${selectedAO.color.split(' ')[0].replace('bg-', 'bg-').replace('-50', '-600')}`}
                                >
                                    {isAnalyzing ? <Loader2 className="animate-spin" size={24}/> : <Sparkles size={24}/>} 
                                    {isAnalyzing ? 'Analyzing Script...' : 'Check My Work'}
                                </button>
                            ) : (
                                <div className="flex gap-4">
                                    <button onClick={() => { setAnalysisResult(''); setCheckerFile(null); }} className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl hover:bg-gray-200">
                                        Check Another
                                    </button>
                                    <button onClick={handleDownloadFeedback} className="flex-1 bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 flex justify-center items-center gap-2 shadow-lg">
                                        <Download size={20}/> Save Feedback
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksAO;