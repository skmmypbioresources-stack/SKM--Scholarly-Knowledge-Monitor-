
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSetting, saveSetting } from '../services/db';
import { resetSystem, exportData } from '../services/storageService';
import { backupToCloud, restoreFromCloud, testConnection } from '../services/cloudService';
import { ChevronLeft, Cloud, Save, Download, RefreshCw, Database, Trash2, CheckCircle2, XCircle, HelpCircle, Folder, Copy, Info, Server, Loader2, Upload, ShieldAlert, Lock, AlertTriangle } from 'lucide-react';

const APP_SCRIPT_CODE = `function doPost(e) { return handleRequest(e); }
function doGet(e) { return handleRequest(e); }

const ACCESS_CODE = "SKM_SECURE_2024"; 

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);
  
  try {
    const params = e.parameter || {};
    const postData = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = params.action || postData.action;
    const code = params.secret || postData.secret;
    
    if (code !== ACCESS_CODE) return respond({result: 'error', error: 'Unauthorized'});
    
    const mainFolder = getOrCreateFolder(params.folderName || postData.folderName);
    let data = null;

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
      let studentJson = loadFile(batchFolder, "student_" + params.studentId + ".json");
      
      const recoveredAssessments = recoverAssessmentsFromSheet(params.studentId);
      const recoveredTerms = recoverTermExamsFromSheet(params.studentId);

      // FORCE OVERWRITE: If spreadsheet has data, we MUST use it to clear ghost data
      if (recoveredAssessments.length > 0 || recoveredTerms.length > 0) {
         if (!studentJson) {
            studentJson = {
              id: params.studentId,
              batch: params.batchId,
              name: recoveredAssessments.length > 0 ? recoveredAssessments[0].studentName : "Recovered Student",
              assessments: [],
              termAssessments: [],
              topics: [],
              attendance: [],
              tuitionTasks: [],
              tuitionReflections: []
            };
         }
         // Replace with clean spreadsheet data
         studentJson.assessments = recoveredAssessments;
         studentJson.termAssessments = recoveredTerms;
         
         studentJson.assessments.sort((a,b) => b.date.localeCompare(a.date));
         studentJson.termAssessments.sort((a,b) => b.date.localeCompare(a.date));
      }
      data = studentJson;
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
    else if (action === 'delete_row') {
      data = deleteRowFromSheet(postData.sheetName, postData.studentId, postData.matchParams);
    }
    else if (action === 'backup_db') {
       saveFile(mainFolder, "FULL_DB_BACKUP.json", postData.data);
       data = "OK";
    }
    else if (action === 'get_backup') {
       data = loadFile(mainFolder, "FULL_DB_BACKUP.json");
    }
    
    return respond({result: 'success', data: data});
      
  } catch (e) {
    return respond({result: 'error', error: e.toString()});
  } finally {
    lock.releaseLock();
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
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

function deleteRowFromSheet(sheetName, studentId, matchParams) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return "Sheet not found";
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return "No data to delete";
  
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const idIdx = headers.indexOf('studentid');
  
  const paramIndices = {};
  for (var key in matchParams) {
    paramIndices[key] = headers.indexOf(key.toLowerCase());
  }

  var deletedCount = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    if (matchIds(data[i][idIdx], studentId)) {
      var allMatch = true;
      for (var key in matchParams) {
        if (paramIndices[key] === -1) continue;
        
        var cellVal = data[i][paramIndices[key]];
        var matchVal = matchParams[key];
        
        if (cellVal instanceof Date) {
           cellVal = Utilities.formatDate(cellVal, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        }
        
        if (String(cellVal).trim() !== String(matchVal).trim()) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }
  }
  return "Deleted " + deletedCount + " rows";
}

function matchIds(idA, idB) {
  if (idA === undefined || idA === null || idB === undefined || idB === null) return false;
  var a = String(idA).trim().split('.')[0];
  var b = String(idB).trim().split('.')[0];
  return a === b;
}

function recoverAssessmentsFromSheet(studentId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('AssessmentReflections');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const rawHeaders = data[0].map(h => String(h).trim());
  const headers = rawHeaders.map(h => h.toLowerCase());

  const idIdx = headers.indexOf('studentid');
  const nameIdx = headers.indexOf('studentname');
  const dateIdx = headers.indexOf('date');
  const titleIdx = headers.indexOf('title');
  const scoreIdx = headers.indexOf('score');
  const typeIdx = headers.indexOf('type');
  const wwwIdx = headers.indexOf('reflection');
  const ebiIdx = headers.indexOf('actionplan');

  const results = [];
  for (var i = 1; i < data.length; i++) {
    if (matchIds(data[i][idIdx], studentId)) {
      const title = String(data[i][titleIdx]);
      const dateVal = data[i][dateIdx];
      const dateStr = dateVal instanceof Date 
        ? Utilities.formatDate(dateVal, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd")
        : String(dateVal).trim();
      
      const scoreParts = String(data[i][scoreIdx]).split('/');
      const s = parseFloat(scoreParts[0]) || 0;
      const m = parseFloat(scoreParts[1]) || 100;
      
      var percCalculated = m > 0 ? Math.round((s / m) * 100) : 0;

      results.push({
        id: "rec_" + studentId + "_" + dateStr + "_" + title.replace(/\\s+/g, ''),
        studentName: data[i][nameIdx],
        date: dateStr,
        title: title,
        type: data[i][typeIdx] || 'Formative',
        score: s,
        maxScore: m,
        percentage: percCalculated,
        whatWentWell: data[i][wwwIdx],
        whatToImprove: data[i][ebiIdx]
      });
    }
  }
  return results;
}

function recoverTermExamsFromSheet(studentId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('TermExamReflections');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase());

  const idIdx = headers.indexOf('studentid');
  const dateIdx = headers.indexOf('date');
  const typeIdx = headers.indexOf('examtype');
  const scoreIdx = headers.indexOf('score');
  const wwwIdx = headers.indexOf('reflection');
  const apIdx = headers.indexOf('actionplan');

  const results = [];
  for (var i = 1; i < data.length; i++) {
    if (matchIds(data[i][idIdx], studentId)) {
      const examType = String(data[i][typeIdx]);
      const dateVal = data[i][dateIdx];
      const dateStr = dateVal instanceof Date 
        ? Utilities.formatDate(dateVal, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd")
        : String(dateVal).trim();

      const scoreParts = String(data[i][scoreIdx]).split('/');
      const s = parseFloat(scoreParts[0]) || 0;
      const m = parseFloat(scoreParts[1]) || 100;
      
      var percCalculated = m > 0 ? Math.round((s / m) * 100) : 0;

      results.push({
        id: "term_" + studentId + "_" + dateStr + "_" + examType.replace(/\\s+/g, ''),
        examType: examType,
        date: dateStr,
        score: s,
        maxScore: m,
        percentage: percCalculated,
        whatWentWell: data[i][wwwIdx],
        actionPlan: data[i][apIdx]
      });
    }
  }
  return results;
}`;

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const [cloudUrl, setCloudUrl] = useState('');
  const [folderName, setFolderName] = useState('SKM_Backups');
  const [isSaving, setIsSaving] = useState(false);
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const load = async () => {
      const url = await getSetting('cloud_script_url');
      const folder = await getSetting('backup_folder_name');
      if (url) setCloudUrl(url);
      if (folder) setFolderName(folder);
    };
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await saveSetting('cloud_script_url', cloudUrl.trim());
    await saveSetting('backup_folder_name', folderName.trim());
    setIsSaving(false);
    
    setConnStatus('testing');
    const success = await testConnection();
    setConnStatus(success ? 'success' : 'failed');
  };

  const handleBackup = async () => {
    if(!confirm("Push entire system database to Cloud?")) return;
    setIsBackingUp(true);
    try {
        const msg = await backupToCloud();
        alert(msg);
    } catch(e) { alert("Backup Failed"); }
    finally { setIsBackingUp(false); }
  };

  const handleRestore = async () => {
      if(!confirm("WIPE LOCAL DATA and restore everything from Cloud Backup?")) return;
      setIsRestoring(true);
      try {
          await restoreFromCloud();
          alert("Restore Successful. App will reload.");
          window.location.reload();
      } catch(e) { alert("Restore Failed"); }
      finally { setIsRestoring(false); }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APP_SCRIPT_CODE);
    alert("Script V8.0 copied! IMPORTANT: Clear Code.gs completely and paste this. Do NOT copy the whole page.");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col items-center">
      <div className="max-w-4xl w-full">
        <button onClick={() => navigate('/welcome')} className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors mb-8 font-bold">
          <ChevronLeft size={20} className="mr-1" /> Back to Dashboard
        </button>

        <div className="mb-12">
          <h1 className="text-4xl font-black text-gray-900">System Admin Settings</h1>
          <p className="text-gray-500 mt-2 font-medium">Configure cloud synchronization and soul recovery.</p>
        </div>

        <div className="grid gap-8">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-indigo-100">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Server size={24}/></div>
                    <h2 className="text-2xl font-bold text-gray-800">Cloud Automation</h2>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Google Apps Script URL</label>
                        <input 
                            className="w-full border-2 border-gray-50 bg-slate-50 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all font-mono text-sm"
                            placeholder="https://script.google.com/macros/s/.../exec"
                            value={cloudUrl}
                            onChange={e => setCloudUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Root Storage Folder Name</label>
                        <input 
                            className="w-full border-2 border-gray-50 bg-slate-50 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all font-bold"
                            placeholder="SKM_Backups"
                            value={folderName}
                            onChange={e => setFolderName(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4 pt-4">
                        <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-2 transform active:scale-95 transition-all">
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Save Configuration
                        </button>
                        {connStatus === 'success' && <div className="flex items-center gap-2 text-green-600 font-black uppercase text-xs tracking-widest"><CheckCircle2 size={20}/> Connection Verified</div>}
                        {connStatus === 'failed' && <div className="flex items-center gap-2 text-red-500 font-black uppercase text-xs tracking-widest"><XCircle size={20}/> Connection Failed</div>}
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-blue-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><CodeIcon size={24}/></div>
                    <h2 className="text-2xl font-bold text-gray-800">Automation Script Code (V8.0)</h2>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex gap-4 items-start">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={24}/>
                    <div>
                        <p className="text-amber-900 font-black text-sm uppercase tracking-tight">Crucial Instructions</p>
                        <p className="text-amber-800 text-sm font-medium leading-relaxed">Do <b>NOT</b> copy this entire page into Google Apps Script. Only click the "Copy Script" button below, which extracts the pure JavaScript code required for the server.</p>
                    </div>
                </div>
                
                <div className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <span className="text-blue-400 font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400"></div> skm_sync_engine_v8_0.gs</span>
                        <button onClick={handleCopyCode} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-colors shadow-lg">
                            <Copy size={16}/> Copy Script Code
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto font-mono text-xs text-blue-100 opacity-60 bg-black/20 p-4 rounded-xl">
                        <pre>{APP_SCRIPT_CODE}</pre>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-red-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-red-600"><ShieldAlert size={120}/></div>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Database size={24}/></div>
                    <h2 className="text-2xl font-bold text-gray-800">Danger Zone</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-gray-100">
                        <h4 className="font-black text-gray-900 mb-2 uppercase text-xs tracking-widest">Global Backups</h4>
                        <div className="flex flex-col gap-2">
                            <button onClick={handleBackup} disabled={isBackingUp} className="w-full bg-white border-2 border-blue-100 text-blue-600 py-3 rounded-xl font-black text-sm hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">
                                {isBackingUp ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18}/>} Push Database to Cloud
                            </button>
                            <button onClick={handleRestore} disabled={isRestoring} className="w-full bg-white border-2 border-indigo-100 text-indigo-600 py-3 rounded-xl font-black text-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2">
                                {isRestoring ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>} Restore from Cloud
                            </button>
                        </div>
                    </div>
                    <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                        <h4 className="font-black text-red-900 mb-2 uppercase text-xs tracking-widest">System Reset</h4>
                        <button onClick={() => { if(confirm("WIPE ALL DATA?")) resetSystem().then(()=>window.location.reload()); }} className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-sm hover:bg-red-700 shadow-lg flex items-center justify-center gap-2">
                            <Trash2 size={18}/> Factory Reset System
                        </button>
                        <p className="text-[10px] text-red-400 mt-3 font-bold text-center">Caution: This wipes your local database entirely.</p>
                    </div>
                </div>
            </div>
        </div>
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default AdminSettings;

const CodeIcon = ({ size, className }: { size?: number, className?: string }) => (
    <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
);
