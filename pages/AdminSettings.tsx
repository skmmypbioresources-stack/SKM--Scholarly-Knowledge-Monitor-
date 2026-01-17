
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSetting, saveSetting } from '../services/db';
import { resetSystem, exportData } from '../services/storageService';
import { backupToCloud, restoreFromCloud, testConnection } from '../services/cloudService';
import { ChevronLeft, Cloud, Save, Download, RefreshCw, Database, Trash2, CheckCircle2, XCircle, HelpCircle, Folder, Copy, Info, Server, Loader2, Upload, ShieldAlert, Lock } from 'lucide-react';

const APP_SCRIPT_CODE = `
// ==========================================
// SKM CLOUD SYNC SCRIPT (V4.1)
// ==========================================

const ACCESS_CODE = "SKM_SECURE_2024"; 

function doPost(e) { return handle(e); }
function doGet(e) { return handle(e); }

function handle(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);
  
  try {
    const params = e.parameter || {};
    const postData = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = params.action || postData.action;
    const code = params.secret || postData.secret;
    
    if (code !== ACCESS_CODE) throw new Error("Unauthorized");
    
    let data = null;
    const mainFolder = getOrCreateFolder(params.folderName || postData.folderName);
    
    if (action === 'ping') {
      data = "Connected";
    } 
    else if (action === 'upload_file') {
      const blob = Utilities.newBlob(Utilities.base64Decode(postData.data), postData.mimeType, postData.filename);
      const existing = mainFolder.getFilesByName(postData.filename);
      while (existing.hasNext()) existing.next().setTrashed(true);
      const file = mainFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      data = { url: file.getDownloadUrl(), id: file.getId() };
    }
    else if (action === 'sync_batch_resources') {
      const batchFolder = getOrCreateFolderIn(mainFolder, postData.batchId);
      saveFile(batchFolder, "syllabus_resources.json", postData.data);
      data = "OK";
    }
    else if (action === 'get_batch_resources') {
      const batchFolder = getOrCreateFolderIn(mainFolder, params.batchId);
      data = loadFile(batchFolder, "syllabus_resources.json");
    }
    else if (action === 'sync_assessment_tasks') {
      const batchFolder = getOrCreateFolderIn(mainFolder, postData.batchId);
      saveFile(batchFolder, "assessment_tasks.json", postData.data);
      data = "OK";
    }
    else if (action === 'get_assessment_tasks') {
      const batchFolder = getOrCreateFolderIn(mainFolder, params.batchId);
      data = loadFile(batchFolder, "assessment_tasks.json");
    }
    else if (action === 'sync_challenge_library') {
      saveFile(mainFolder, "challenge_library.json", postData.data);
      data = "OK";
    }
    else if (action === 'get_challenge_library') {
      data = loadFile(mainFolder, "challenge_library.json");
    }
    else if (action === 'student_sync') {
      const batchFolder = getOrCreateFolderIn(mainFolder, postData.batchId);
      saveFile(batchFolder, "student_" + postData.studentId + ".json", postData.data);
      data = "OK";
    }
    else if (action === 'get_student_sync') {
      const batchFolder = getOrCreateFolderIn(mainFolder, params.batchId);
      data = loadFile(batchFolder, "student_" + params.studentId + ".json");
    }
    else if (action === 'get_batch_students') {
      const batchFolder = getOrCreateFolderIn(mainFolder, params.batchId);
      const files = batchFolder.getFiles();
      const students = [];
      while (files.hasNext()) {
        const file = files.next();
        if (file.getName().startsWith("student_")) students.push(JSON.parse(file.getBlob().getDataAsString()));
      }
      data = students;
    }
    else if (action === 'log_reflection') {
      logToSheet(postData.sheetName, postData.data);
      data = "OK";
    }
    else if (action === 'backup_db') {
       saveFile(mainFolder, "FULL_DB_BACKUP.json", postData.data);
       data = "OK";
    }
    else if (action === 'get_backup') {
       data = loadFile(mainFolder, "FULL_DB_BACKUP.json");
    }
    
    return ContentService.createTextOutput(JSON.stringify({result: 'success', data: data}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({result: 'error', error: e.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateFolder(name) {
  if(!name) name = "SKM_Backups";
  const iter = DriveApp.getFoldersByName(name);
  if (iter.hasNext()) return iter.next();
  return DriveApp.createFolder(name);
}

function getOrCreateFolderIn(parent, name) {
  const iter = parent.getFoldersByName(name);
  if (iter.hasNext()) return iter.next();
  return parent.createFolder(name);
}

function saveFile(folder, filename, data) {
  const iter = folder.getFilesByName(filename);
  while (iter.hasNext()) iter.next().setTrashed(true);
  return folder.createFile(filename, JSON.stringify(data), MimeType.PLAIN_TEXT);
}

function loadFile(folder, filename) {
  const iter = folder.getFilesByName(filename);
  if (iter.hasNext()) return JSON.parse(iter.next().getBlob().getDataAsString());
  return null;
}

function logToSheet(sheetName, dataObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(Object.keys(dataObj));
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  const row = headers.map(h => dataObj[h] || "");
  sheet.appendRow(row);
}
`;

const AdminSettings: React.FC = () => {
    const navigate = useNavigate();
    const [cloudUrl, setCloudUrl] = useState('');
    const [folderName, setFolderName] = useState('SKM_Backups');
    const [isSavingUrl, setIsSavingUrl] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
    const [showGuide, setShowGuide] = useState(true);
    const [backupStatus, setBackupStatus] = useState('');
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [restoreStatus, setRestoreStatus] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        const load = async () => {
            const url = await getSetting('cloud_script_url');
            const folder = await getSetting('backup_folder_name');
            if (url) { 
                setCloudUrl(url); 
                setShowGuide(false); 
                setConnectionStatus('idle');
            }
            if (folder) setFolderName(folder);
        };
        load();
    }, []);

    const handleSaveConfig = async () => {
        if (!cloudUrl.trim()) {
            alert("Please paste your Automation URL (Google Script link).");
            return;
        }
        setIsSavingUrl(true);
        try {
            await saveSetting('cloud_script_url', cloudUrl.trim());
            await saveSetting('backup_folder_name', folderName.trim());
            setConnectionStatus('idle'); 
            alert("Configuration Saved! You can now verify the connection.");
        } catch (e) { 
            alert("Failed to save settings."); 
        }
        finally { setIsSavingUrl(false); }
    };

    const handleTestConnection = async () => {
        if (!cloudUrl.trim()) {
            alert("Please save a URL first.");
            return;
        }
        setConnectionStatus('testing');
        try {
            const success = await testConnection();
            setConnectionStatus(success ? 'success' : 'failed');
            if (success) {
                alert("Connection Verified! The app is now bridged to your Google Cloud.");
            } else {
                alert("Connection failed. Check your Script URL and Ensure 'Anyone' has access.");
            }
        } catch (e) { 
            setConnectionStatus('failed'); 
            alert("Error during verification.");
        }
    };

    const handleCloudBackup = async () => {
        setIsBackingUp(true);
        try { await backupToCloud(); setBackupStatus('Sync Successful'); }
        catch (e: any) { setBackupStatus('Error: ' + e.message); }
        finally { setIsBackingUp(false); }
    };

    const handleCloudRestore = async () => {
        if(!confirm("Overwrite local data? This will replace your local student list with the remote version.")) return;
        setIsRestoring(true);
        try { await restoreFromCloud(); navigate('/login'); }
        catch (e: any) { setRestoreStatus('Error: ' + e.message); setIsRestoring(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/welcome')} className="flex items-center text-gray-500 hover:text-indigo-700 transition-colors mb-8 font-semibold">
                    <ChevronLeft size={20} className="mr-1" /> Dashboard
                </button>
                <div className="flex flex-col md:flex-row justify-between md:items-end mb-10 gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">System Admin</h1>
                        <p className="text-gray-500 font-medium">Finalizing deployment for 2025-2026</p>
                    </div>
                    <button onClick={() => setShowGuide(!showGuide)} className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50">
                        <HelpCircle size={18}/> {showGuide ? 'Hide Setup' : 'Show Setup'}
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-8 mb-8 animate-fade-in">
                    <div className="bg-indigo-600 text-white p-6 rounded-2xl mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-xl"><Lock size={24}/></div>
                            <div>
                                <h3 className="text-xl font-black">Security Lockdown</h3>
                                <p className="text-indigo-100 text-sm">Passcode '2025' is mandatory for student entry.</p>
                            </div>
                        </div>
                        <div className="bg-white text-indigo-700 px-4 py-1.5 rounded-full font-black text-sm border-2 border-indigo-400">
                           STATUS: SECURED
                        </div>
                    </div>

                    {showGuide && (
                        <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl mb-8 text-sm">
                            <div className="flex items-center gap-2 mb-4 text-white font-bold text-lg border-b border-slate-700 pb-2">
                                <Server size={20} className="text-green-400"/> Automation Setup (V4.1)
                            </div>
                            <p className="mb-4">1. Create a new Google Apps Script. 2. Paste the provided logic. 3. Click <b>Deploy > New Deployment</b>. 4. Select <b>Web App</b>. 5. Set Access to <b>"Anyone"</b>. 6. Copy the URL here.</p>
                            <div className="mt-6 relative group">
                                <button onClick={() => { navigator.clipboard.writeText(APP_SCRIPT_CODE); alert("Copied!"); }} className="absolute right-2 top-2 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold">Copy Script</button>
                                <textarea readOnly className="w-full h-48 bg-black/50 text-green-400 font-mono text-xs p-4 rounded-xl outline-none resize-y border border-slate-700" value={APP_SCRIPT_CODE} />
                            </div>
                        </div>
                    )}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Automation URL</label>
                            <input type="text" value={cloudUrl} onChange={e => setCloudUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="w-full border border-gray-300 rounded-xl px-4 py-3 font-mono text-sm shadow-inner" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Primary Storage Folder Name</label>
                            <input type="text" value={folderName} onChange={e => setFolderName(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3" />
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">System automation handled internally.</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 pt-2">
                            <button onClick={handleSaveConfig} disabled={isSavingUrl} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                <Save size={18} /> {isSavingUrl ? 'Saving...' : 'Commit Changes'}
                            </button>
                            <button onClick={handleTestConnection} className={`px-6 py-3 rounded-xl font-bold border transition-all flex items-center gap-2 ${connectionStatus === 'success' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-600'}`}>
                                {connectionStatus === 'testing' ? <RefreshCw className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Verify Connection
                            </button>
                        </div>
                    </div>
                    <hr className="my-8 border-gray-100" />
                    <div className="grid md:grid-cols-2 gap-6">
                         <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                             <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Cloud size={18} className="text-blue-500"/> Full Remote Sync</h3>
                             <p className="text-xs text-gray-500 mb-4">Uploads the entire database to your remote folder as a single archive.</p>
                             <button onClick={handleCloudBackup} disabled={isBackingUp || !cloudUrl} className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50">
                                {isBackingUp ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>} Start Sync
                             </button>
                             {backupStatus && <p className="mt-2 text-xs font-bold text-green-600">{backupStatus}</p>}
                         </div>
                         <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                             <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><RefreshCw size={18} className="text-purple-500"/> Remote Pull</h3>
                             <p className="text-xs text-gray-500 mb-4">Fetches the latest remote archive and updates this local instance.</p>
                             <button onClick={handleCloudRestore} disabled={isRestoring || !cloudUrl} className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50">
                                {isRestoring ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>} Pull Data
                             </button>
                             {restoreStatus && <p className="mt-2 text-xs font-bold text-blue-600">{restoreStatus}</p>}
                         </div>
                    </div>
                </div>

                <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 text-red-600 p-3 rounded-xl"><ShieldAlert size={24}/></div>
                        <div>
                            <h4 className="font-black text-red-900">Total System Reset</h4>
                            <p className="text-red-700 text-sm">Wipes all local student and batch data. Use with extreme caution.</p>
                        </div>
                    </div>
                    <button 
                        onClick={async () => { if(confirm("PERMANENT DATA WIPE: Are you 100% sure?")) { await resetSystem(); navigate('/login'); } }}
                        className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 shadow-md"
                    >
                        Factory Reset
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
