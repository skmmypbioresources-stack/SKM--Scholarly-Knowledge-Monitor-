
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, VocabWord } from '../types';
import { updateStudent, checkEmpowermentQuota } from '../services/storageService';
import { getWordOrigin } from '../services/geminiService';
import { BookA, Plus, Trash2, Book, Loader2, Zap } from 'lucide-react';

const VocabBuilder: React.FC = () => {
  const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
  
  const [word, setWord] = useState('');
  const [def, setDef] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const list = student.vocabList || [];

  const handleAdd = async () => {
      if(!word) return;
      setIsAdding(true);
      let origin = "";
      const { allowed } = await checkEmpowermentQuota(student);
      if (allowed) origin = await getWordOrigin(word);
      else origin = "Daily AI Limit Reached";

      const newWord: VocabWord = {
          id: Date.now().toString(),
          word,
          origin,
          definition: def || 'No def',
          example: '',
          mastered: false
      };
      await updateStudent({...student, vocabList: [newWord, ...list]});
      await refreshStudent();
      setWord(''); setDef(''); setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
      if(isReadOnly) return; 
      if(!confirm("Remove word?")) return;
      const updated = list.filter(w => w.id !== id);
      await updateStudent({...student, vocabList: updated});
      await refreshStudent();
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center">
            <h2 className="text-3xl font-black text-gray-900 flex items-center justify-center gap-2"><BookA size={32}/> Scientific Vocabulary</h2>
            <p className="text-gray-500 mt-2">Build your personal dictionary. AI will find the root origins for you!</p>
        </div>

        {!isReadOnly && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Word</label>
                    <input className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Photosynthesis" value={word} onChange={e=>setWord(e.target.value)}/>
                </div>
                <div className="flex-[2] w-full">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Definition (Optional)</label>
                    <input className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Meaning..." value={def} onChange={e=>setDef(e.target.value)}/>
                </div>
                <button onClick={handleAdd} disabled={isAdding || !word} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md h-fit flex items-center gap-2 disabled:opacity-50 min-w-[140px] justify-center">
                    {isAdding ? <Loader2 className="animate-spin" size={20}/> : <><Plus size={20}/> Add Word</>}
                </button>
            </div>
        )}

        <div className="grid gap-4">
            {list.length > 0 ? list.map(w => (
                <div key={w.id} className="bg-white p-6 rounded-xl border border-gray-200 flex justify-between items-center hover:shadow-md transition-all group">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-indigo-900">{w.word}</h3>
                            {w.origin && <span className="bg-indigo-50 text-indigo-600 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 border border-indigo-100"><Zap size={12} className="fill-indigo-600"/> {w.origin}</span>}
                        </div>
                        <p className="text-gray-600 leading-relaxed text-lg">{w.definition}</p>
                    </div>
                    {!isReadOnly && <button onClick={() => handleDelete(w.id)} className="text-gray-300 hover:text-red-500 p-3 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>}
                </div>
            )) : <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 flex flex-col items-center"><Book size={48} className="mb-2 opacity-20"/>No words added yet.</div>}
        </div>
    </div>
  );
};

export default VocabBuilder;
