
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, BatchResource, Curriculum } from '../types';
import { getBatchResourcesFromCloud, syncBatchResources } from '../services/cloudService';
import { getBatchResources, addBatchResource, removeBatchResource, saveBatchResourcesList } from '../services/storageService';
import { Library, RefreshCw, Loader2, BookOpen, ExternalLink, Download, LayoutList, Calendar, FileText } from 'lucide-react';

const SyllabusLibrary: React.FC = () => {
    const { student, isReadOnly } = useOutletContext<{ student: Student, isReadOnly: boolean }>();
    const [activeTab, setActiveTab] = useState<'TOPICS' | 'EXAMS'>('TOPICS');
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
    const [topicResources, setTopicResources] = useState<BatchResource[]>([]);
    const [examPortions, setExamPortions] = useState<BatchResource[]>([]);

    useEffect(() => {
        loadData();
    }, [activeTopicId, student.batch]);

    const loadData = async () => {
        const all = await getBatchResources(student.batch, ''); // Get all for batch
        // Filter by specific topic
        if (activeTopicId) {
            const topicRes = await getBatchResources(student.batch, activeTopicId);
            setTopicResources(topicRes.filter(r => r.category === 'study_resource'));
        }
        // Filter by Exam category
        setExamPortions(all.filter(r => r.category === 'term_syllabus'));
    };

    const handleRefresh = async () => {
        setIsSyncing(true);
        try {
            const res = await getBatchResourcesFromCloud(student.batch);
            if (res.result === 'success' && res.data) {
                await saveBatchResourcesList(res.data);
                await loadData();
                alert("Library Updated from Cloud!");
            }
        } catch (e) {
            alert("Sync Failed.");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2 flex items-center gap-2">
                        <Library className="text-teal-600"/> Syllabus Library
                    </h2>
                    <p className="text-gray-500">Access study resources, notes, and exam syllabus portions.</p>
                </div>
                <button onClick={handleRefresh} disabled={isSyncing} className="bg-white border border-gray-200 text-teal-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-50 shadow-sm">
                    {isSyncing ? <Loader2 className="animate-spin"/> : <RefreshCw size={18}/>} Sync
                </button>
            </div>

            <div className="flex gap-4 border-b border-gray-200 pb-1">
                <button onClick={() => setActiveTab('TOPICS')} className={`px-6 py-3 font-bold text-lg border-b-4 transition-colors ${activeTab==='TOPICS' ? 'border-teal-500 text-teal-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    Topic Resources
                </button>
                <button onClick={() => setActiveTab('EXAMS')} className={`px-6 py-3 font-bold text-lg border-b-4 transition-colors ${activeTab==='EXAMS' ? 'border-teal-500 text-teal-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    Exam Portions
                </button>
            </div>

            {activeTab === 'TOPICS' && (
                <div className="grid md:grid-cols-12 gap-6 min-h-[500px]">
                    <div className="md:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-xs text-gray-500 uppercase">Topics</div>
                        <div className="flex-1 overflow-y-auto">
                            {student.topics.map(t => (
                                <div key={t.id} onClick={() => setActiveTopicId(t.id)} className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-teal-50 transition-colors ${activeTopicId === t.id ? 'bg-teal-50 text-teal-800 font-bold border-l-4 border-l-teal-600' : 'text-gray-600'}`}>
                                    {t.title}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                        {activeTopicId ? (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <BookOpen size={24} className="text-teal-500"/> 
                                    {student.topics.find(t=>t.id===activeTopicId)?.title}
                                </h3>
                                <div className="space-y-4">
                                    {topicResources.length > 0 ? topicResources.map(r => (
                                        <div key={r.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:shadow-sm border border-transparent transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-white p-2 rounded-lg text-teal-600 shadow-sm"><Download size={20}/></div>
                                                <span className="font-bold text-gray-700">{r.name}</span>
                                            </div>
                                            <a href={r.url} target="_blank" className="text-teal-600 font-bold text-sm bg-white px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-600 hover:text-white">View</a>
                                        </div>
                                    )) : <div className="text-center py-12 text-gray-400 italic">No resources added for this topic.</div>}
                                </div>
                            </>
                        ) : <div className="h-full flex flex-col items-center justify-center text-gray-400"><LayoutList size={48} className="mb-4 opacity-20"/><p>Select a topic to view resources.</p></div>}
                    </div>
                </div>
            )}

            {activeTab === 'EXAMS' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm min-h-[400px]">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Calendar size={24} className="text-orange-500"/> Official Exam Syllabus Copies</h3>
                    {examPortions.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-4">
                            {examPortions.map(r => (
                                <div key={r.id} className="p-6 bg-orange-50 rounded-2xl border border-orange-100 flex items-center justify-between group hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white rounded-xl shadow-sm text-orange-600"><FileText size={28}/></div>
                                        <div><h4 className="font-bold text-gray-900">{r.name}</h4><p className="text-xs text-orange-600 font-bold uppercase">Syllabus PDF</p></div>
                                    </div>
                                    <a href={r.url} target="_blank" className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-700">Open</a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-400">
                            <Calendar size={48} className="mx-auto text-teal-200 mb-4"/>
                            <p>No exam portions published yet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
export default SyllabusLibrary;
