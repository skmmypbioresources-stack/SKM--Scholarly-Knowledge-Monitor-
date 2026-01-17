
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, SchoolAttendanceRecord } from '../types';
import { updateStudent } from '../services/storageService';
import { CalendarDays, CheckCircle, XCircle, Clock, Plus, Trash2 } from 'lucide-react';

const SchoolAttendance: React.FC = () => {
  const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
  
  const [isAdding, setIsAdding] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Present' | 'Absent' | 'Late' | 'Excused'>('Absent');
  const [reason, setReason] = useState('');

  const records = student.schoolAttendance || [];
  
  // Stats
  const total = records.length;
  const present = records.filter(r => r.status === 'Present').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 100;

  const handleAdd = async () => {
      const newRecord: SchoolAttendanceRecord = { date, status, reason };
      // Filter existing for same date to overwrite
      const filtered = records.filter(r => r.date !== date);
      await updateStudent({ ...student, schoolAttendance: [newRecord, ...filtered].sort((a,b) => b.date.localeCompare(a.date)) });
      await refreshStudent();
      setIsAdding(false);
      setReason('');
  };

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">School Attendance</h2>
                <p className="text-lg text-gray-500">Daily attendance log.</p>
            </div>
            {(
                <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700">
                    <Plus size={18} /> Log Attendance
                </button>
            )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                 <div>
                     <p className="text-gray-500 text-xs font-bold uppercase">Attendance Rate</p>
                     <p className={`text-4xl font-black ${rate >= 90 ? 'text-green-600' : 'text-amber-600'}`}>{rate}%</p>
                 </div>
                 <CalendarDays size={32} className="text-gray-300"/>
             </div>
        </div>

        {isAdding && (
            <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg animate-fade-in max-w-lg">
                <h3 className="font-bold text-gray-800 mb-4">Log Day</h3>
                <div className="space-y-4">
                    <input type="date" className="w-full border p-2 rounded-lg" value={date} onChange={e=>setDate(e.target.value)} />
                    <div className="flex gap-2">
                        {['Present', 'Absent', 'Late', 'Excused'].map(s => (
                            <button key={s} onClick={()=>setStatus(s as any)} className={`flex-1 py-2 rounded-lg font-bold text-sm ${status===s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{s}</button>
                        ))}
                    </div>
                    {status !== 'Present' && (
                        <input className="w-full border p-2 rounded-lg" placeholder="Reason (Optional)" value={reason} onChange={e=>setReason(e.target.value)} />
                    )}
                    <div className="flex justify-end gap-2">
                        <button onClick={()=>setIsAdding(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                        <button onClick={handleAdd} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Save</button>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                    <tr><th className="p-4">Date</th><th className="p-4">Status</th><th className="p-4">Reason</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {records.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="p-4 font-medium">{r.date}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${r.status==='Present'?'bg-green-100 text-green-700': r.status==='Absent'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>
                                    {r.status}
                                </span>
                            </td>
                            <td className="p-4 text-gray-500 italic">{r.reason || '-'}</td>
                        </tr>
                    ))}
                    {records.length===0 && <tr><td colSpan={3} className="p-8 text-center text-gray-400">No records.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default SchoolAttendance;