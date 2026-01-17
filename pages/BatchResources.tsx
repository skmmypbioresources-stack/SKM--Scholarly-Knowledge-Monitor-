
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BatchResource } from '../types';
import { syncBatchResources, getBatchResourcesFromCloud, uploadFileToCloud } from '../services/cloudService';
import { addBatchResource, getBatchResources, removeBatchResource, saveBatchResourcesList } from '../services/storageService';
import { getSetting } from '../services/db';
import { INITIAL_TOPICS_IGCSE, INITIAL_TOPICS_MYP } from '../services/mockData';
import { ChevronLeft, Globe, Trash2, RefreshCw, Loader2, BookOpen, Folder, Upload, Cloud, AlertTriangle, File as FileIcon, FileText } from 'lucide-react';

const BatchResources: React.FC = () => {
    const { curriculum, batchId } = useParams<{ curriculum: string, batchId: string }>();
    const navigate = useNavigate();
    
    const [selectedTopicId, setSelectedTopicId] = useState<string>('');
    const [resources, setResources] = useState<BatchResource[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConfigured, setIsConfigured] = useState(true); 
    
    const [title, setTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [category, setCategory] = useState<'study_resource' | 'term_syllabus'>('study_resource');
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const topics = curriculum === 'IGCSE' ? INITIAL_TOPICS_IGCSE : INITIAL_TOPICS_MYP;

    useEffect(() => {
        if (topics.length > 0 && !selectedTopicId) {
            setSelectedTopicId(topics[0].id);
        }
    }, [curriculum]);

    useEffect(() => {
        const checkConfig = async () => {
            const url = await getSetting('cloud_script_url');
            setIsConfigured(!!url);
        };
        checkConfig();
    }, []);

    useEffect(() => {
        const load = async () => {
            if (batchId && selectedTopicId) {
                const res = await getBatchResources(batchId, selectedTopicId);
                setResources(res.filter(r => r.category !== 'assessment' && r.category !== 'marking_scheme'));
            }
        };
        load();
    }, [selectedTopicId, batchId]);

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleUploadAndSync = async () => {
        if (!isConfigured) { navigate('/admin/settings'); return; }
        if (!title || !selectedFile || !batchId || !selectedTopicId) return;
        setIsUploading(true);
        try {
            const base64 = await convertToBase64(selectedFile);
            const filename = `${batchId}_${selectedTopicId}_${category}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            const cloudResponse = await uploadFileToCloud(base64, filename, selectedFile.type);
            if (cloudResponse.result !== 'success') throw new Error(cloudResponse.error);

            const newResource: BatchResource = {
                id: Date.now().toString(),
                name: title,
                type: 'link',
                url: cloudResponse.data.url,
                category: category,
                batchId: batchId,
                topicId: selectedTopicId,
                uploadedBy: 'ADMIN',
                dateAdded: Date.now()
            };
            await addBatchResource(newResource);
            setResources(prev => [...prev, newResource]);
            const allForTopic = await getBatchResources(batchId, selectedTopicId);
            await syncBatchResources(batchId, allForTopic);
            alert(`Uploaded Successfully!`);
            setTitle(''); setSelectedFile(null);
        } catch (e: any) {
            alert("Upload Failed: " + e.message);
        } finally { setIsUploading(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete shared resource?")) return;
        await removeBatchResource(id);
        setResources(prev => prev.filter(r => r.id !== id));
        const allForTopic = await getBatchResources(batchId!, selectedTopicId);
        syncBatchResources(batchId!, allForTopic);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate(`/curriculum/${curriculum}`)} className="flex items-center text-gray-500 hover:text-gray-900 font-bold mb-8"><ChevronLeft size={20} /> Back</button>
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Manage Syllabus & Resources</h1>
                        <p className="text-gray-500 mt-1">Upload study materials for <span className="font-bold text-indigo-600">{batchId}</span></p>
                    </div>
                </div>

                <div className="grid md:grid-cols-4 gap-8">
                    <div className="md:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-200px)] flex flex-col">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-500 text-xs uppercase">Select Topic</div>
                        <div className="flex-1 overflow-y-auto">
                            {topics.map(t => (
                                <div key={t.id} onClick={() => setSelectedTopicId(t.id)} className={`p-4 cursor-pointer border-b border-gray-100 text-sm font-medium transition-colors ${selectedTopicId === t.id ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>{t.title}</div>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-3 space-y-6">
                        <div className={`bg-white p-6 rounded-2xl border ${isConfigured ? 'border-indigo-100' : 'border-gray-200'} shadow-sm`}>
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Cloud size={20} className="text-indigo-600"/> Upload PDF to Drive</h3>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Section in Library</label>
                                <select className="w-full border p-3 rounded-xl bg-gray-50 text-sm font-medium" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                                    <option value="study_resource">Topic Resources Section</option>
                                    <option value="term_syllabus">Exam Portions Section</option>
                                </select>
                            </div>
                            <div className="space-y-4">
                                <input className="w-full border p-3 rounded-xl" placeholder="File Title" value={title} onChange={e => setTitle(e.target.value)}/>
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center hover:bg-indigo-50 cursor-pointer">
                                    <input ref={fileInputRef} type="file" accept="application/pdf" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} className="hidden"/>
                                    <Upload size={24} className="mx-auto text-indigo-400 mb-2"/>
                                    <span className="text-sm font-bold text-indigo-600">{selectedFile ? selectedFile.name : "Select PDF File"}</span>
                                </div>
                                <div className="flex justify-end"><button onClick={handleUploadAndSync} disabled={!title || !selectedFile || isUploading} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-md disabled:opacity-50">{isUploading ? 'Uploading...' : 'Publish to Students'}</button></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[300px]">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4"><Globe size={20}/> Current Batch Resources</h3>
                            <div className="space-y-3">
                                {resources.map(r => (
                                    <div key={r.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-white border border-transparent hover:border-gray-200">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white p-2 rounded-lg">{r.category === 'term_syllabus' ? <FileText className="text-orange-500"/> : <BookOpen className="text-indigo-500"/>}</div>
                                            <div>
                                                <a href={r.url} target="_blank" className="text-blue-600 font-bold hover:underline">{r.name}</a>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">{r.category === 'term_syllabus' ? 'Exam Portions' : 'Topic Resources'}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={20}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default BatchResources;
