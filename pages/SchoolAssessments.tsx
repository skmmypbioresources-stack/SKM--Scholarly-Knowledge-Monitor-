
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, TermAssessment, Curriculum, DEFAULT_TERM_EXAMS } from '../types';
import { updateStudent } from '../services/storageService';
import { logTermExam } from '../services/cloudService';
import { Plus, Trash2, Edit, BarChart2, TrendingUp, ClipboardList, Loader2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';

const SchoolAssessments: React.FC = () => {
  const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Custom Delete Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [selectedExamType, setSelectedExamType] = useState<string>(DEFAULT_TERM_EXAMS[0]);
  const [isCustomExam, setIsCustomExam] = useState(false);
  const [customExamName, setCustomExamName] = useState('');
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100'); 
  const [whatWentWell, setWhatWentWell] = useState('');
  const [actionPlan, setActionPlan] = useState('');

  const isIGCSE = student.curriculum === Curriculum.IGCSE;
  const buttonBg = isIGCSE ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';
  const barFill = isIGCSE ? '#2563eb' : '#16a34a'; 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseFloat(score);
    const m = parseFloat(maxScore);
    const finalExamName = isCustomExam ? customExamName.trim() : selectedExamType;

    if (!finalExamName || isNaN(s) || isNaN(m) || m === 0) return;

    setIsSaving(true);
    const newAssessment: TermAssessment = {
      id: editingId || Date.now().toString(),
      examType: finalExamName,
      date: date,
      score: s,
      maxScore: m,
      percentage: Math.round((s / m) * 100),
      whatWentWell,
      actionPlan
    };

    const currentTerms = student.termAssessments || [];
    const updatedTerms = editingId ? currentTerms.map(a => a.id === editingId ? newAssessment : a) : [...currentTerms, newAssessment];

    const updatedStudent = { ...student, termAssessments: updatedTerms };
    await updateStudent(updatedStudent);
    
    // Cloud Log
    await logTermExam(student, newAssessment);

    await refreshStudent();
    setIsSaving(false);
    setIsModalOpen(false);
    resetForm();
    alert("Reflection Saved & Logged Successfully!");
  };

  const handleEdit = (assessment: TermAssessment) => {
    setEditingId(assessment.id);
    const isDefault = DEFAULT_TERM_EXAMS.includes(assessment.examType);
    if (isDefault) {
        setSelectedExamType(assessment.examType);
        setIsCustomExam(false);
    } else {
        setSelectedExamType('OTHER_CUSTOM');
        setIsCustomExam(true);
        setCustomExamName(assessment.examType);
    }
    setDate(assessment.date);
    setScore(assessment.score.toString());
    setWhatWentWell(assessment.whatWentWell || '');
    setActionPlan(assessment.actionPlan || '');
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    const updatedStudent = { ...student, termAssessments: student.termAssessments.filter(a => a.id !== deleteId) };
    await updateStudent(updatedStudent);
    await refreshStudent();
    setDeleteId(null); // Close modal
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedExamType(DEFAULT_TERM_EXAMS[0]);
    setIsCustomExam(false);
    setCustomExamName('');
    setDate(new Date().toISOString().split('T')[0]);
    setScore('');
    setWhatWentWell('');
    setActionPlan('');
  };

  const graphData = (student.termAssessments || []).map(a => ({ name: a.examType.replace('Examination', ''), percentage: a.percentage }));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Term Examinations</h2>
        {!isReadOnly && (
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className={`flex gap-2 ${buttonBg} text-white px-6 py-3 rounded-xl font-bold shadow-md`}>
                <Plus size={20} /> Log Term Exam Result
            </button>
        )}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800"><BarChart2 size={24}/> Comparison</h3>
        <div className="h-80 w-full">
            {graphData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={graphData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <ReferenceLine y={50} stroke="red" strokeDasharray="3 3" />
                        <Bar dataKey="percentage" fill={barFill} barSize={60} radius={[8, 8, 0, 0]}>
                            <LabelList dataKey="percentage" position="top" fill="black" formatter={(v:any)=>`${v}%`}/>
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 border border-dashed rounded-xl">No data.</div>}
        </div>
      </div>

      <div className="grid gap-8">
        {(student.termAssessments || []).map((a) => (
          <div key={a.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
                <div><h3 className="font-bold text-xl">{a.examType}</h3><p className="text-gray-500">{a.date}</p></div>
                <div className="flex items-center gap-4">
                    <span className={`text-3xl font-extrabold ${isIGCSE ? 'text-blue-700' : 'text-green-700'}`}>{a.percentage}%</span>
                    {!isReadOnly && (
                      <>
                        <button onClick={() => handleEdit(a)}><Edit size={20} className="text-blue-400 hover:text-blue-600"/></button>
                        <button onClick={() => setDeleteId(a.id)}><Trash2 size={20} className="text-red-400 hover:text-red-600"/></button>
                      </>
                    )}
                </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-green-50 p-5 rounded-xl border border-green-100"><h4 className="font-bold mb-2 flex gap-2"><ClipboardList size={16}/> Reflection</h4><p className="italic">{a.whatWentWell}</p></div>
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100"><h4 className="font-bold mb-2 flex gap-2"><TrendingUp size={16}/> Action Plan</h4><p className="italic">{a.actionPlan}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-10">
            <h3 className="text-3xl font-bold mb-8">{editingId ? 'Edit Exam' : 'Log Exam'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <select className="w-full border rounded-xl px-4 py-3" value={isCustomExam ? 'OTHER_CUSTOM' : selectedExamType} onChange={(e) => {
                  if(e.target.value === 'OTHER_CUSTOM') { setIsCustomExam(true); setSelectedExamType(''); }
                  else { setIsCustomExam(false); setSelectedExamType(e.target.value); }
              }}>
                {DEFAULT_TERM_EXAMS.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="OTHER_CUSTOM">+ Custom...</option>
              </select>
              {isCustomExam && <input className="w-full border rounded-xl px-4 py-3" value={customExamName} onChange={e=>setCustomExamName(e.target.value)} placeholder="Exam Name"/>}
              <input type="date" className="w-full border rounded-xl px-4 py-3" value={date} onChange={e=>setDate(e.target.value)}/>
              <div className="grid grid-cols-2 gap-6">
                <input type="number" className="w-full border rounded-xl px-4 py-3" value={score} onChange={e=>setScore(e.target.value)} placeholder="Score"/>
                <input readOnly type="number" className="w-full border rounded-xl px-4 py-3 bg-gray-100" value={maxScore}/>
              </div>
              <textarea required className="w-full border rounded-xl px-4 py-3 h-24" value={whatWentWell} onChange={e=>setWhatWentWell(e.target.value)} placeholder="My Reflection..."/>
              <textarea required className="w-full border rounded-xl px-4 py-3 h-24" value={actionPlan} onChange={e=>setActionPlan(e.target.value)} placeholder="Action Plan..."/>
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-600 font-bold">Cancel</button>
                <button type="submit" disabled={isSaving} className={`px-8 py-3 ${buttonBg} text-white font-bold rounded-xl flex gap-2`}>{isSaving && <Loader2 className="animate-spin"/>} Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL - replaces browser confirm() */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in">
             <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle size={24} />
                <h3 className="text-xl font-bold">Confirm Deletion</h3>
             </div>
             <p className="text-gray-600 mb-6">Are you sure you want to delete this exam record? This action cannot be undone.</p>
             <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setDeleteId(null)} 
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                >
                  Delete
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SchoolAssessments;
