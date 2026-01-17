
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, PredictedGradeLog } from '../types';
import { updateStudent } from '../services/storageService';
import { TrendingUp, Plus, Trash2, Calendar } from 'lucide-react';

const PredictedGrades: React.FC = () => {
  const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
  
  const [isAdding, setIsAdding] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('Science');
  const [grade, setGrade] = useState('');
  const [comment, setComment] = useState('');

  const logs = student.predictedGradeLogs || [];

  const handleAdd = async () => {
      if (!grade) return;
      const newLog: PredictedGradeLog = {
          id: Date.now().toString(),
          date,
          subject,
          grade,
          comment
      };
      await updateStudent({ ...student, predictedGradeLogs: [newLog, ...logs] });
      await refreshStudent();
      setIsAdding(false);
      setGrade('');
      setComment('');
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Delete record?")) return;
      const updated = logs.filter(l => l.id !== id);
      await updateStudent({ ...student, predictedGradeLogs: updated });
      await refreshStudent();
  };

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Predicted Grades Log</h2>
                <p className="text-lg text-gray-500">Official teacher predictions and tracking.</p>
            </div>
            {(
                <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700">
                    <Plus size={18} /> Add Prediction
                </button>
            )}
        </div>

        {isAdding && (
            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-lg animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-4">New Grade Prediction</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                        <input type="date" className="w-full border p-2 rounded-lg" value={date} onChange={e=>setDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                        <input className="w-full border p-2 rounded-lg" value={subject} onChange={e=>setSubject(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Predicted Grade</label>
                        <input className="w-full border p-2 rounded-lg" placeholder="e.g. A*" value={grade} onChange={e=>setGrade(e.target.value)} />
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teacher Comment</label>
                    <input className="w-full border p-3 rounded-xl" placeholder="Reasoning..." value={comment} onChange={e=>setComment(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={()=>setIsAdding(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                    <button onClick={handleAdd} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Save Log</button>
                </div>
            </div>
        )}

        <div className="grid gap-4">
            {logs.length > 0 ? logs.map(log => (
                <div key={log.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
                    <div className="flex gap-6 items-center">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-xl font-bold text-2xl w-20 text-center">{log.grade}</div>
                        <div>
                            <h4 className="font-bold text-gray-800 text-lg">{log.subject}</h4>
                            <p className="text-sm text-gray-500 flex items-center gap-2"><Calendar size={14}/> {log.date}</p>
                            {log.comment && <p className="text-gray-600 mt-1 italic">"{log.comment}"</p>}
                        </div>
                    </div>
                    {(
                        <button onClick={()=>handleDelete(log.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                    )}
                </div>
            )) : <p className="text-center text-gray-400 py-10">No predictions logged yet.</p>}
        </div>
    </div>
  );
};

export default PredictedGrades;