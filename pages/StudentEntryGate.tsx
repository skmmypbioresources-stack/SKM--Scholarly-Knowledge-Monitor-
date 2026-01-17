
import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { generatePaper6Question, generatePaper4TheoryQuestion, generatePaper4DiagramQuestion, verifyChallengeAnswer } from '../services/geminiService';
import { awardChallengePoints, getChallengeImages, addChallengeImage, updateStudent } from '../services/storageService';
import { getChallengeLibraryFromCloud } from '../services/cloudService';
import { Lock, Zap, Brain, Image as ImageIcon, CheckCircle2, XCircle, Loader2, ArrowRight, FileText, Calculator, RefreshCw } from 'lucide-react';

interface Props {
    student: Student;
    onUnlock: () => void;
}

type Mode = 'P4_STRUCTURAL' | 'P4_DIAGRAM' | 'P6_ATP';
type Step = 'SELECTION' | 'CHALLENGE' | 'RESULT';

const StudentEntryGate: React.FC<Props> = ({ student, onUnlock }) => {
    const [step, setStep] = useState<Step>('SELECTION');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [syncingBank, setSyncingBank] = useState(false);
    
    const [questionData, setQuestionData] = useState<{question: string, context?: string, imageUrl?: string} | null>(null);
    const [answer, setAnswer] = useState('');
    const [result, setResult] = useState<{score: number, explanation: string} | null>(null);

    // Auto-sync bank on mount if empty
    useEffect(() => {
        const checkBank = async () => {
            const local = await getChallengeImages();
            if (local.length === 0) {
                setSyncingBank(true);
                try {
                    const cloud = await getChallengeLibraryFromCloud();
                    if (cloud.result === 'success' && Array.isArray(cloud.data)) {
                        for (const img of cloud.data) {
                            await addChallengeImage(img);
                        }
                    }
                } catch (e) {
                    console.warn("Could not auto-sync bank.");
                } finally {
                    setSyncingBank(false);
                }
            }
        };
        checkBank();
    }, []);

    const loadQuestion = async (selectedMode: Mode) => {
        setLoading(true);
        setStep('CHALLENGE');
        setQuestionData(null);
        setAnswer('');
        setResult(null);

        try {
            const history = student.challengeHistory || [];
            let data;

            if (selectedMode === 'P4_STRUCTURAL') {
                data = await generatePaper4TheoryQuestion(student.curriculum, history);
            } 
            else if (selectedMode === 'P6_ATP') {
                data = await generatePaper6Question(student.curriculum, history);
            } 
            else if (selectedMode === 'P4_DIAGRAM') {
                let images = await getChallengeImages();
                
                // Final fallback sync check
                if (images.length === 0) {
                    const res = await getChallengeLibraryFromCloud();
                    if (res.result === 'success' && res.data) {
                         for (const img of res.data) await addChallengeImage(img);
                         images = await getChallengeImages();
                    }
                }

                if (images.length === 0) {
                    data = await generatePaper4TheoryQuestion(student.curriculum, history);
                    data.question = "(No diagrams found in bank) " + data.question;
                } else {
                    const randomImg = images[Math.floor(Math.random() * images.length)];
                    data = await generatePaper4DiagramQuestion(randomImg, history);
                    data.imageUrl = randomImg.base64.startsWith('data:') ? randomImg.base64 : `data:image/png;base64,${randomImg.base64}`;
                }
            }

            if (data) {
                setQuestionData(data);
                // Update history to prevent repeat next time
                const updatedHistory = [...history, data.question];
                await updateStudent({ ...student, challengeHistory: updatedHistory });
            }
        } catch (e) {
            setQuestionData({ question: "Define Homeostasis.", context: "Maintenance of stable environment" });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim() || !questionData) return;
        setVerifying(true);
        const verification = await verifyChallengeAnswer(answer, questionData.context || '', questionData.question);
        setVerifying(false);
        setResult(verification);
        setStep('RESULT');
        if (verification.score > 0) {
            // Award points based on AI score
            await awardChallengePoints(student, verification.score);
        }
    };

    const renderSelectionScreen = () => (
        <div className="max-w-7xl w-full mx-auto px-6 animate-fade-in flex flex-col items-center justify-center min-h-screen py-10 relative z-10">
            <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white border border-green-100 shadow-xl mb-8">
                    <Lock size={40} className="text-green-600" />
                </div>
                <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-700">
                    Gatekeeper Challenge
                </h1>
                <p className="text-xl text-blue-800 font-medium max-w-3xl mx-auto leading-relaxed">
                    Select a challenge type to unlock your dashboard. <br/>
                    {syncingBank && <span className="text-xs text-blue-400 font-bold flex items-center justify-center gap-1 mt-2 animate-pulse"><RefreshCw size={12} className="animate-spin"/> Syncing shared diagrams...</span>}
                    <span className="text-white font-bold bg-green-500 px-4 py-1 rounded-full mt-3 inline-block shadow-md text-sm">Earn up to 10 Growth Points</span>
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl">
                <button onClick={() => loadQuestion('P4_STRUCTURAL')} className="group relative bg-white border border-blue-100 rounded-[2rem] p-10 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col h-full">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"><FileText size={32} /></div>
                    <h3 className="text-2xl font-bold text-blue-900 mb-2">Paper 4 / Criterion A</h3>
                    <p className="text-blue-500 font-bold uppercase text-xs tracking-widest mb-4">Theory & Understanding</p>
                    <p className="text-slate-500 text-base leading-relaxed">Definitions, functions, and explaining biological processes.</p>
                </button>

                <button onClick={() => loadQuestion('P4_DIAGRAM')} className="group relative bg-white border border-purple-100 rounded-[2rem] p-10 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col h-full">
                    <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors"><ImageIcon size={32} /></div>
                    <h3 className="text-2xl font-bold text-blue-900 mb-2">Paper 4 / Criterion A</h3>
                    <p className="text-purple-500 font-bold uppercase text-xs tracking-widest mb-4">Diagrams & Visuals</p>
                    <p className="text-slate-500 text-base leading-relaxed">Identify labels and functions based on biological images.</p>
                </button>

                <button onClick={() => loadQuestion('P6_ATP')} className="group relative bg-white border border-teal-100 rounded-[2rem] p-10 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col h-full">
                    <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors"><Calculator size={32} /></div>
                    <h3 className="text-2xl font-bold text-blue-900 mb-2">Paper 6 / Criterion B&C</h3>
                    <p className="text-teal-500 font-bold uppercase text-xs tracking-widest mb-4">Practical & Evaluation</p>
                    <p className="text-slate-500 text-base leading-relaxed">Magnification, % Change, Variables, and Table Data.</p>
                </button>
            </div>
        </div>
    );

    const renderChallengeScreen = () => (
        <div className="w-full max-w-6xl mx-auto px-6 animate-fade-in min-h-screen flex items-center justify-center relative z-10">
             <div className="w-full bg-white rounded-[2.5rem] border border-gray-100 p-8 md:p-14 shadow-2xl relative">
                <button onClick={() => setStep('SELECTION')} className="absolute top-6 right-6 text-slate-400 hover:text-blue-600 font-bold bg-slate-50 px-4 py-2 rounded-full border border-slate-200 text-sm transition-colors">Back to Selection</button>
                {loading ? (
                     <div className="py-24 flex flex-col items-center justify-center text-slate-400"><Loader2 className="animate-spin mb-4 text-blue-500" size={48} /><p className="text-xl font-medium text-blue-900">Preparing your question...</p></div>
                ) : (
                    <div className="flex flex-col h-full justify-center">
                        <h2 className="text-lg text-green-600 font-bold mb-6 uppercase tracking-widest flex items-center gap-2"><Brain size={24}/> Challenge Question</h2>
                        {questionData?.imageUrl && (
                            <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200 shadow-lg max-h-[400px] w-fit mx-auto"><img src={questionData.imageUrl} alt="Challenge Diagram" className="h-full object-contain max-h-[400px]" /></div>
                        )}
                        <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 mb-8"><p className="text-xl md:text-2xl font-bold text-blue-900 leading-relaxed">{questionData?.question}</p></div>
                        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto w-full">
                            <input autoFocus type="text" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type your answer here..." className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-xl text-blue-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner" />
                            <button type="submit" disabled={verifying || !answer} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl py-4 rounded-2xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-3 transform active:scale-95">
                                {verifying ? <Loader2 className="animate-spin w-6 h-6" /> : <>Submit Answer <ArrowRight size={24} /></>}
                            </button>
                        </form>
                    </div>
                )}
             </div>
        </div>
    );

    const renderResultScreen = () => {
        const isSuccess = (result?.score || 0) >= 4;
        const isPerfect = (result?.score || 0) === 10;
        
        return (
            <div className="w-full max-w-4xl mx-auto px-6 animate-fade-in min-h-screen flex items-center justify-center relative z-10">
                <div className={`w-full rounded-[2.5rem] border p-10 md:p-14 text-center shadow-2xl bg-white ${isSuccess ? 'border-green-200' : 'border-red-200'}`}>
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isSuccess ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                    </div>
                    
                    <h2 className={`text-4xl md:text-5xl font-black mb-2 tracking-tight ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
                        {isPerfect ? "Excellent Work!" : isSuccess ? "Good Effort!" : "Not quite right."}
                    </h2>
                    
                    <div className="mb-6">
                         <span className={`text-2xl font-black px-6 py-2 rounded-full ${isSuccess ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            Score: {result?.score || 0} / 10
                         </span>
                    </div>

                    <div className={`rounded-3xl p-8 mb-10 text-left border ${isSuccess ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                            Examiner Feedback
                        </p>
                        <p className="text-xl text-slate-800 leading-relaxed font-medium">{result?.explanation}</p>
                    </div>

                    {(result?.score || 0) > 0 && (
                        <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold text-lg mb-10">
                            <Zap size={20} className="fill-green-600"/> +{result?.score} Growth Points Earned
                        </div>
                    )}

                    <button onClick={onUnlock} className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold text-2xl py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02]">
                        Enter Dashboard <ArrowRight size={24} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
             <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-green-100/40 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '2s'}}></div>
            </div>
            {step === 'SELECTION' && renderSelectionScreen()}
            {step === 'CHALLENGE' && renderChallengeScreen()}
            {step === 'RESULT' && renderResultScreen()}
        </div>
    );
};

export default StudentEntryGate;
