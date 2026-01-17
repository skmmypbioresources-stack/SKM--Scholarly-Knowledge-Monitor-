
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student } from '../types';
import { generateTypingText } from '../services/geminiService';
import { checkEmpowermentQuota } from '../services/storageService';
import { Keyboard, CheckCircle2, Zap } from 'lucide-react';

const TypingTutor: React.FC = () => {
  const { student, refreshStudent } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void> }>();
  const [text, setText] = useState("Loading...");
  const [isOffline, setIsOffline] = useState(false);
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [activeFinger, setActiveFinger] = useState('');

  const loadText = async () => {
      setInput('');
      setCompleted(false);
      setStartTime(null);
      setWpm(0);
      setIsOffline(false);

      const { allowed } = await checkEmpowermentQuota(student);
      
      if (!allowed) {
          setIsOffline(true);
          setText("Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar.");
          await refreshStudent();
          return;
      }

      const txt = await generateTypingText(student.curriculum);
      setText(txt.trim());
      await refreshStudent();
  };

  useEffect(() => { loadText(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!startTime) setStartTime(Date.now());
      setInput(val);
      if (startTime) {
          const time = (Date.now() - startTime) / 60000;
          setWpm(Math.round((val.length / 5) / time));
      }
      if (val === text) setCompleted(true);
      const nextChar = text[val.length]?.toLowerCase();
      if (!nextChar) setActiveFinger('Done!');
      else if ('qaz'.includes(nextChar)) setActiveFinger('Left Pinky');
      else if ('wsx'.includes(nextChar)) setActiveFinger('Left Ring');
      else if ('edc'.includes(nextChar)) setActiveFinger('Left Middle');
      else if ('rfvtgb'.includes(nextChar)) setActiveFinger('Left Index');
      else if ('yhnujm'.includes(nextChar)) setActiveFinger('Right Index');
      else if ('ik,'.includes(nextChar)) setActiveFinger('Right Middle');
      else if ('ol.'.includes(nextChar)) setActiveFinger('Right Ring');
      else if ('p;/[\']'.includes(nextChar)) setActiveFinger('Right Pinky');
      else if (nextChar === ' ') setActiveFinger('Thumb');
  };

  return (
    <div className="max-w-4xl mx-auto text-center space-y-8">
        <h2 className="text-3xl font-black text-gray-900 flex items-center justify-center gap-3">
            <Keyboard size={32}/> BioType Tutor
        </h2>
        
        {isOffline && (
            <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold inline-flex items-center gap-2">
                <Zap size={16}/> Daily Limit Reached (Practice Mode)
            </div>
        )}

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-200">
            <div className="mb-6 text-left text-lg font-medium text-gray-500 leading-loose font-mono bg-gray-50 p-6 rounded-xl relative select-none">
                {text.split('').map((char, i) => {
                    let color = 'text-gray-400';
                    if (i < input.length) {
                        color = input[i] === char ? 'text-green-600' : 'text-red-500 bg-red-100';
                    }
                    if (i === input.length) color = 'bg-blue-200 text-blue-800 animate-pulse';
                    return <span key={i} className={color}>{char}</span>;
                })}
            </div>
            
            {!completed ? (
                <input 
                    autoFocus
                    className="w-full p-4 text-xl font-mono border-2 border-blue-100 rounded-xl focus:border-blue-500 outline-none shadow-sm"
                    value={input}
                    onChange={handleChange}
                    placeholder="Start typing..."
                />
            ) : (
                <div className="bg-green-100 text-green-800 p-6 rounded-xl font-bold text-xl animate-fade-in flex flex-col items-center gap-2">
                    <CheckCircle2 size={48}/>
                    Great Job! Speed: {wpm} WPM
                    <button onClick={loadText} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700">Next Lesson</button>
                </div>
            )}
        </div>

        <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg">
                <p className="text-blue-200 uppercase text-xs font-bold tracking-wider">Current Finger</p>
                <p className="text-3xl font-black mt-1">{activeFinger || 'Ready'}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200">
                <p className="text-gray-400 uppercase text-xs font-bold tracking-wider">Live WPM</p>
                <p className="text-3xl font-black text-gray-800">{wpm}</p>
            </div>
        </div>
    </div>
  );
};

export default TypingTutor;
