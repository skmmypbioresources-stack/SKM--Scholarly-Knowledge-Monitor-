
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, Assessment, Curriculum } from '../types';
import { updateStudent } from '../services/storageService';
import { logAssessmentRecord } from '../services/cloudService';
import { Plus, Trash2, TrendingUp, Loader2, Edit } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const AssessmentRecords: React.FC = () => {
  const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [type, setType] = useState<'Formative' | 'Summative'>('Formative');
  
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');

  const isIGCSE = student.curriculum === Curriculum.IGCSE;
  const buttonBg = isIGCSE ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';
  const iconColor = isIGCSE ? 'text-blue-500' : 'text-green-500';
  const strokeColor = isIGCSE ? '#2563eb' : '#16a34a'; 
  const percentageColor = isIGCSE ? 'text-blue-700' : 'text-green-700';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseFloat(score);
    const m = parseFloat(maxScore);
    
    if (!title || isNaN(s) || isNaN(m) || m === 0) return;

    setIsSaving(true);

    const assessmentData: Assessment = {
      id: editingId || Date.now().toString(),
      title,
      date,
      score: s,
      maxScore: m,
      percentage: Math.round((s / m) * 100),
      type,
      whatWentWell,
      whatToImprove
    };

    let updatedAssessments;
    if (editingId) {
        updatedAssessments = student.assessments.map(a => a.id === editingId ? assessmentData : a);
    } else {
        updatedAssessments = [...student.assessments, assessmentData];
    }

    const updatedStudent = { ...student, assessments: updatedAssessments };
    await updateStudent(updatedStudent);
    
    // Log to Cloud (Google Sheets)
    await logAssessmentRecord(student, assessmentData);

    await refreshStudent();
    setIsSaving(false);
    setIsModalOpen(false);
    resetForm();
    alert(editingId ? "Assessment Updated & Logged Successfully!" : "Assessment Added & Logged Successfully!");
  };

  const handleEdit = (assessment: Assessment) => {
    setEditingId(assessment.id);
    setTitle(assessment.title);
    setDate(assessment.date);
    setScore(assessment.score.toString());
    setMaxScore(assessment.maxScore.toString());
    setType(assessment.type);
    setWhatWentWell(assessment.whatWentWell || '');
    setWhatToImprove(assessment.whatToImprove || '');
    setIsModalOpen(true);
  };

  const deleteAssessment = async (id: string) => {
    if (confirm('Are you sure you want to delete this assessment?')) {
        const updatedStudent = {
            ...student,
            assessments: student.assessments.filter(a => a.id !== id)
        };
        await updateStudent(updatedStudent);
        await refreshStudent();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setScore('');
    setMaxScore('');
    setType('Formative');
    setWhatWentWell('');
    setWhatToImprove('');
  };

  const graphData = student.assessments.map(a => ({ name: a.title, percentage: a.percentage }));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Assessment Records & Reflections</h2>
            <p className="text-lg text-gray-500">Track your grades, reflect on progress, and plan next steps.</p>
        </div>
        {!isReadOnly && (
            <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className={`flex items-center gap-2 ${buttonBg} text-white px-6 py-3 rounded-xl transition-colors shadow-md text-base font-bold`}
            >
            <Plus size={20} /> Add Assessment
            </button>
        )}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <TrendingUp size={24} className={iconColor}/> Performance Trend
        </h3>
        <div className="h-80 w-full">
            {graphData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} unit="%" />
                        <Tooltip />
                        <ReferenceLine y={50} stroke="red" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="percentage" stroke={strokeColor} strokeWidth={4} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 border border-dashed rounded-xl">No data available.</div>
            )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-base text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase text-sm font-bold">
                    <tr>
                        <th className="px-8 py-5">Date</th>
                        <th className="px-8 py-5">Title</th>
                        <th className="px-8 py-5">Type</th>
                        <th className="px-8 py-5">Score</th>
                        <th className="px-8 py-5">Percentage</th>
                        <th className="px-8 py-5 min-w-[240px]">My Reflection</th>
                        <th className="px-8 py-5 min-w-[240px]">Action Plan</th>
                        {!isReadOnly && <th className="px-8 py-5 text-right">Action</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {student.assessments.length > 0 ? student.assessments.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50/50">
                            <td className="px-8 py-5">{a.date}</td>
                            <td className="px-8 py-5 font-bold text-gray-900">{a.title}</td>
                            <td className="px-8 py-5">{a.type}</td>
                            <td className="px-8 py-5">{a.score}/{a.maxScore}</td>
                            <td className={`px-8 py-5 font-bold ${percentageColor}`}>{a.percentage}%</td>
                            <td className="px-8 py-5 italic">{a.whatWentWell || '-'}</td>
                            <td className="px-8 py-5 italic">{a.whatToImprove || '-'}</td>
                            {!isReadOnly && (
                                <td className="px-8 py-5 text-right flex justify-end gap-2">
                                    <button onClick={() => handleEdit(a)} className="text-blue-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full"><Edit size={18} /></button>
                                    <button onClick={() => deleteAssessment(a.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full"><Trash2 size={18} /></button>
                                </td>
                            )}
                        </tr>
                    )) : <tr><td colSpan={8} className="px-8 py-12 text-center text-gray-400">No assessments recorded.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-3xl font-bold mb-6 text-gray-900">{editingId ? 'Edit Assessment' : 'Add New Assessment'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input required type="text" className="w-full border rounded-xl px-4 py-3" value={title} onChange={e => setTitle(e.target.value)} placeholder="Assessment Title" />
              <div className="grid grid-cols-2 gap-6">
                  <select className="w-full border rounded-xl px-4 py-3" value={type} onChange={(e) => setType(e.target.value as any)}>
                    <option value="Formative">Formative</option>
                    <option value="Summative">Summative</option>
                  </select>
                  <input type="date" className="w-full border rounded-xl px-4 py-3" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <input required type="number" className="w-full border rounded-xl px-4 py-3" value={score} onChange={e => setScore(e.target.value)} placeholder="Score" />
                <input required type="number" className="w-full border rounded-xl px-4 py-3" value={maxScore} onChange={e => setMaxScore(e.target.value)} placeholder="Max Score" />
              </div>
              <textarea required className="w-full border rounded-xl px-4 py-3 h-24" value={whatWentWell} onChange={e => setWhatWentWell(e.target.value)} placeholder="My Reflection..." />
              <textarea required className="w-full border rounded-xl px-4 py-3 h-24" value={whatToImprove} onChange={e => setWhatToImprove(e.target.value)} placeholder="Action Plan..." />
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-600 font-bold">Cancel</button>
                <button type="submit" disabled={isSaving} className={`px-8 py-3 ${buttonBg} text-white font-bold rounded-xl flex gap-2 items-center`}>
                    {isSaving && <Loader2 className="animate-spin" size={18} />} {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentRecords;
