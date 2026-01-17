
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, BehaviorRecord } from '../types';
import { updateStudent } from '../services/storageService';
import { Award, AlertTriangle, Plus, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';

const Behavior: React.FC = () => {
  const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
  
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<'Merit' | 'Demerit'>('Merit');
  const [category, setCategory] = useState('Participation');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const records = student.behaviorRecords || [];
  const totalMerits = records.filter(r => r.type === 'Merit').reduce((sum, r) => sum + r.points, 0);
  const totalDemerits = records.filter(r => r.type === 'Demerit').reduce((sum, r) => sum + r.points, 0);
  const netPoints = totalMerits - totalDemerits;

  const handleAdd = async () => {
      if (!description) return;
      const newRecord: BehaviorRecord = {
          id: Date.now().toString(),
          date,
          type,
          category,
          description,
          points: Number(points)
      };
      
      const updatedRecords = [newRecord, ...records];
      await updateStudent({ ...student, behaviorRecords: updatedRecords });
      await refreshStudent();
      setIsAdding(false);
      setDescription('');
      setPoints(1);
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Delete this record?")) return;
      const updatedRecords = records.filter(r => r.id !== id);
      await updateStudent({ ...student, behaviorRecords: updatedRecords });
      await refreshStudent();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Behavior & Merits</h2>
            <p className="text-lg text-gray-500">Track your classroom contributions and conduct.</p>
          </div>
          {(
             <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700">
                 <Plus size={18} /> Add Record
             </button>
          )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center gap-4">
              <div className="p-4 bg-white rounded-full text-green-600 shadow-sm"><ThumbsUp size={24}/></div>
              <div>
                  <p className="text-sm font-bold text-green-800 uppercase tracking-wider">Total Merits</p>
                  <p className="text-4xl font-black text-green-600">{totalMerits}</p>
              </div>
          </div>
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="p-4 bg-white rounded-full text-red-600 shadow-sm"><ThumbsDown size={24}/></div>
              <div>
                  <p className="text-sm font-bold text-red-800 uppercase tracking-wider">Total Demerits</p>
                  <p className="text-4xl font-black text-red-600">{totalDemerits}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-gray-50 rounded-full text-gray-600 shadow-inner"><Award size={24}/></div>
              <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Net Score</p>
                  <p className={`text-4xl font-black ${netPoints >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{netPoints}</p>
              </div>
          </div>
      </div>

      {isAdding && (
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg animate-fade-in">
              <h3 className="font-bold text-gray-800 mb-4">New Entry</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                      <div className="flex gap-2">
                          <button onClick={()=>setType('Merit')} className={`flex-1 py-2 rounded-lg font-bold ${type==='Merit'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>Merit</button>
                          <button onClick={()=>setType('Demerit')} className={`flex-1 py-2 rounded-lg font-bold ${type==='Demerit'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-500'}`}>Demerit</button>
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                      <select className="w-full border p-2 rounded-lg" value={category} onChange={e=>setCategory(e.target.value)}>
                          <option>Participation</option>
                          <option>Homework</option>
                          <option>Behavior</option>
                          <option>Excellence</option>
                          <option>Other</option>
                      </select>
                  </div>
              </div>
              <div className="mb-4">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                   <input className="w-full border p-3 rounded-xl" placeholder="Reason for record..." value={description} onChange={e=>setDescription(e.target.value)} />
              </div>
              <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                       <label className="text-xs font-bold text-gray-500 uppercase">Points:</label>
                       <input type="number" className="w-16 border p-2 rounded-lg" value={points} onChange={e=>setPoints(Number(e.target.value))} min="1" />
                   </div>
                   <div className="flex gap-2">
                       <button onClick={()=>setIsAdding(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                       <button onClick={handleAdd} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Save</button>
                   </div>
              </div>
          </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {records.length > 0 ? (
              <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                      <tr>
                          <th className="p-4">Date</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Description</th>
                          <th className="p-4 text-right">Points</th>
                          <th className="p-4 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {records.map(r => (
                          <tr key={r.id} className="hover:bg-gray-50">
                              <td className="p-4 text-gray-600">{r.date}</td>
                              <td className="p-4">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${r.type==='Merit'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{r.type}</span>
                              </td>
                              <td className="p-4 text-gray-800 font-medium">{r.category}</td>
                              <td className="p-4 text-gray-600">{r.description}</td>
                              <td className="p-4 text-right font-bold">{r.points}</td>
                              <td className="p-4 text-right">
                                  <button onClick={()=>handleDelete(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          ) : <div className="p-8 text-center text-gray-400">No behavior records found.</div>}
      </div>
    </div>
  );
};

export default Behavior;