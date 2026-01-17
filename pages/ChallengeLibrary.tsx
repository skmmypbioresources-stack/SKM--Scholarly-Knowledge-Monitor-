
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addChallengeImage, getChallengeImages, removeChallengeImage } from '../services/storageService';
import { syncChallengeLibrary, getChallengeLibraryFromCloud } from '../services/cloudService';
import { ChallengeImage } from '../types';
import { ChevronLeft, Upload, Trash2, Image as ImageIcon, Loader2, RefreshCw, Cloud } from 'lucide-react';

const ChallengeLibrary: React.FC = () => {
    const navigate = useNavigate();
    const [images, setImages] = useState<ChallengeImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const loadImages = async () => {
        try {
            const imgs = await getChallengeImages();
            setImages(JSON.parse(JSON.stringify(imgs)).sort((a: any, b: any) => b.dateAdded - a.dateAdded));
        } catch (err) {
            console.error("Failed to load library images", err);
        }
    };

    useEffect(() => { loadImages(); }, []);

    const handleSyncToCloud = async () => {
        setIsSyncing(true);
        try {
            const res = await syncChallengeLibrary(images);
            if (res.result === 'success') {
                alert("Success: Image Bank published to Cloud. All students can now see these diagrams.");
            } else {
                alert("Sync failed: " + res.error);
            }
        } catch (e) {
            alert("Error connecting to cloud.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handlePullFromCloud = async () => {
        setIsSyncing(true);
        try {
            const res = await getChallengeLibraryFromCloud();
            if (res.result === 'success' && res.data) {
                for (const img of res.data) {
                    await addChallengeImage(img);
                }
                await loadImages();
                alert("Imported image bank from Cloud.");
            }
        } catch (e) {
            alert("Failed to pull from cloud.");
        } finally {
            setIsSyncing(false);
        }
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !name) return;
        setUploading(true);

        try {
            const fullBase64 = await convertToBase64(file);
            const newImg: ChallengeImage = {
                id: Date.now().toString(),
                name,
                base64: fullBase64,
                dateAdded: Date.now()
            };
            await addChallengeImage(newImg);
            await loadImages();
            setName('');
            setFile(null);
            alert("Local Save Successful. Click 'Sync to Cloud' to publish to students.");
        } catch (error) {
            alert("Failed to save image.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this image?")) return;
        await removeChallengeImage(id);
        await loadImages();
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => navigate('/welcome')} className="flex items-center text-gray-500 hover:text-indigo-700 transition-colors mb-8 font-semibold">
                    <ChevronLeft size={20} className="mr-1" /> Back to Dashboard
                </button>

                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900">Paper 4 Image Bank</h1>
                        <p className="text-gray-600 mt-2">Diagrams for the Paper 4 Gatekeeper Challenge.</p>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={handlePullFromCloud}
                            disabled={isSyncing}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50"
                        >
                            <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""}/> Pull from Cloud
                        </button>
                        <button 
                            onClick={handleSyncToCloud}
                            disabled={isSyncing || images.length === 0}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md"
                        >
                            {isSyncing ? <Loader2 className="animate-spin" size={18}/> : <Cloud size={18}/>} 
                            Sync Bank to Cloud
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Upload size={20} className="text-indigo-600"/> Upload Diagram
                            </h3>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image Label</label>
                                    <input className="w-full border p-3 rounded-xl outline-none" placeholder="e.g. Heart" value={name} onChange={e=>setName(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">File</label>
                                    <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm" required />
                                </div>
                                <button type="submit" disabled={uploading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
                                    {uploading ? <Loader2 className="animate-spin"/> : <Upload size={18}/>} Add Local
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[400px]">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <ImageIcon size={20} className="text-gray-400"/> Local Library ({images.length})
                            </h3>
                            {images.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {images.map(img => (
                                        <div key={img.id} className="group relative rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                                            <img src={img.base64.startsWith('data:') ? img.base64 : `data:image/png;base64,${img.base64}`} alt={img.name} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                <p className="text-white font-bold text-sm truncate mb-2">{img.name}</p>
                                                <button onClick={() => handleDelete(img.id)} className="bg-red-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-700">
                                                    <Trash2 size={14}/> Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <ImageIcon size={48} className="mb-2 opacity-20"/>
                                    <p>Library is empty.</p>
                                </div>
                            )}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChallengeLibrary;
