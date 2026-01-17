
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student } from '../types';
import { generateBioPuzzle } from '../services/geminiService';
import { checkEmpowermentQuota } from '../services/storageService';
import { Puzzle, RefreshCw, HelpCircle, Zap } from 'lucide-react';

const BioPuzzle: React.FC = () => {
  const { student, refreshStudent } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void> }>();
  const [puzzle, setPuzzle] = useState<{question: string, answer: string, hint: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadPuzzle = async () => {
      setLoading(true);
      setRevealed(false);
      setShowHint(false);
      setUserAnswer('');
      setIsOffline(false);

      // 1. Check Quota
      const { allowed } = await checkEmpowermentQuota(student);
      
      if (!allowed) {
          setIsOffline(true);
          setPuzzle({ 
              question: "Daily AI Limit Reached. Review: What acts as the 'brain' of the cell?", 
              answer: "Nucleus", 
              hint: "Starts with N. Contains DNA." 
          });
          setLoading(false);
          await refreshStudent(); // Update UI counter if needed
          return;
      }

      // 2. Call AI
      const raw = await generateBioPuzzle(student.curriculum);
      try {
          const jsonStr = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
          setPuzzle(JSON.parse(jsonStr));
      } catch (e) {
          setPuzzle({ question: "What is the powerhouse of the cell?", answer: "Mitochondria", hint: "Starts with M" });
      }
      
      await refreshStudent(); // Sync usage count
      setLoading(false);
  };

  React.useEffect(() => { if(!puzzle) loadPuzzle(); }, []);

  return (
    <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-black text-purple-900 mb-2 flex items-center justify-center gap-3">
            <Puzzle size={32}/> BioMind Challenge
        </h2>
        <p className="text-purple-600 mb-8">AI-Powered Knowledge Check</p>
        
        {isOffline && (
            <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-6 inline-flex items-center gap-2">
                <Zap size={16}/> Daily AI Limit Reached (Offline Mode)
            </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl border-2 border-purple-100 p-8 relative overflow-hidden">
            {loading ? (
                <div className="py-20 animate-pulse text-purple-400 font-bold">Generating a tricky question...</div>
            ) : puzzle ? (
                <>
                    <div className="mb-8">
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-4 inline-block">Question</span>
                        <h3 className="text-2xl font-bold text-gray-800 leading-relaxed">{puzzle.question}</h3>
                    </div>
                    
                    {!revealed ? (
                        <div className="space-y-4 max-w-md mx-auto">
                            <input 
                                className="w-full text-center text-xl p-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 outline-none transition-all"
                                placeholder="Type your answer..."
                                value={userAnswer}
                                onChange={e => setUserAnswer(e.target.value)}
                            />
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setShowHint(true)} className="px-4 py-2 text-purple-500 font-bold hover:bg-purple-50 rounded-lg flex items-center gap-2">
                                    <HelpCircle size={18}/> {showHint ? puzzle.hint : "Need a Hint?"}
                                </button>
                                <button 
                                    onClick={() => setRevealed(true)}
                                    className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105"
                                >
                                    Check Answer
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-200 animate-fade-in">
                            <p className="text-green-600 font-bold uppercase text-xs mb-1">Correct Answer</p>
                            <p className="text-3xl font-black text-green-800 mb-4">{puzzle.answer}</p>
                            <p className="text-gray-600">You answered: <span className="font-bold">{userAnswer || "(No Answer)"}</span></p>
                        </div>
                    )}
                </>
            ) : null}
        </div>

        <button onClick={loadPuzzle} disabled={loading} className="mt-8 bg-white border-2 border-purple-200 text-purple-700 px-6 py-3 rounded-xl font-bold hover:bg-purple-50 flex items-center gap-2 mx-auto">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""}/> {isOffline ? "Refresh Offline Puzzle" : "Next Challenge"}
        </button>
    </div>
  );
};

export default BioPuzzle;
