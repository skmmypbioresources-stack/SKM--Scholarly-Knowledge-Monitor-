
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, SchoolReport } from '../types';
import { updateStudent } from '../services/storageService';
import { FileText, Plus, Trash2, ExternalLink, Link as LinkIcon } from 'lucide-react';

const Reports: React.FC = () => {
  const { student, refreshStudent, isReadOnly } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void>, isReadOnly: boolean }>();
  
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const reports = student.schoolReports || [];

  const handleAdd = async () => {
      if (!title || !url) return;
      const newReport: SchoolReport = {
          id: Date.now().toString(),
          title,
          url: url.startsWith('http') ? url : `https://${url}`,
          date
      };
      await updateStudent({ ...student, schoolReports: [newReport, ...reports] });
      await refreshStudent();
      setIsAdding(false);
      setTitle('');
      setUrl('');
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Delete report link?")) return;
      const updated = reports.filter(r => r.id !== id);
      await updateStudent({ ...student, schoolReports: updated });
      await refreshStudent();
  };

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">School Reports</h2>
                <p className="text-lg text-gray-500">Access your term reports and official documents.</p>
            </div>
            {(
                <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700">
                    <Plus size={18} /> Add Report Link
                </button>
            )}
        </div>

        {isAdding && (
            <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg animate-fade-in max-w-lg">
                <h3 className="font-bold text-gray-800 mb-4">Add Report Link</h3>
                <div className="space-y-4">
                    <input className="w-full border p-3 rounded-xl" placeholder="Report Title (e.g. Term 1 Report)" value={title} onChange={e=>setTitle(e.target.value)} />
                    <input className="w-full border p-3 rounded-xl" placeholder="Google Drive Link / URL" value={url} onChange={e=>setUrl(e.target.value)} />
                    <input type="date" className="w-full border p-3 rounded-xl" value={date} onChange={e=>setDate(e.target.value)} />
                    <div className="flex justify-end gap-2">
                        <button onClick={()=>setIsAdding(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                        <button onClick={handleAdd} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Save Link</button>
                    </div>
                </div>
            </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
            {reports.length > 0 ? reports.map(report => (
                <div key={report.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><FileText size={24}/></div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-lg">{report.title}</h4>
                            <p className="text-gray-500 text-sm">{report.date}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={report.url} target="_blank" rel="noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                            <ExternalLink size={20} />
                        </a>
                        {(
                            <button onClick={()=>handleDelete(report.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-full"><Trash2 size={20}/></button>
                        )}
                    </div>
                </div>
            )) : <p className="text-gray-400 col-span-2 text-center py-10">No reports uploaded.</p>}
        </div>
    </div>
  );
};

export default Reports;