
import { Student, Assessment, TermAssessment, BatchResource, AssessmentTask, SyllabusPortion, ChallengeImage } from '../types';
import { getSetting, exportData, importData } from './db';

declare var google: any;

const CLOUD_SECRET = "SKM_SECURE_2024";

const getScriptUrl = async (): Promise<string | null> => {
    return await getSetting('cloud_script_url');
};

const getFolderName = async (): Promise<string> => {
    const name = await getSetting('backup_folder_name');
    return name || "SKM_Backups";
};

const sendToCloud = async (payload: any) => {
    // Force retrieval of URL every time to ensure sync consistency
    const savedUrl = await getScriptUrl();
    const finalUrl = payload.urlOverride || savedUrl;
    
    if (typeof google !== 'undefined' && google.script && google.script.run) {
        return new Promise((resolve) => {
            google.script.run
                .withSuccessHandler((res: any) => {
                    try { resolve(typeof res === 'string' ? JSON.parse(res) : res); } 
                    catch(e) { resolve({result:'success', data: res}); }
                })
                .withFailureHandler((e: any) => resolve({ result: 'error', error: e.message }))
                .processReactRequest(payload);
        });
    }

    if (!finalUrl) return { result: 'error', error: 'Automation URL not found. Please paste your Script URL in Admin Settings.' };

    try {
        payload.secret = CLOUD_SECRET;
        
        const queryParams = new URLSearchParams();
        queryParams.append('action', payload.action);
        queryParams.append('secret', CLOUD_SECRET);
        if (payload.folderName) queryParams.append('folderName', payload.folderName);
        if (payload.batchId) queryParams.append('batchId', payload.batchId);
        if (payload.studentId) queryParams.append('studentId', payload.studentId);
        queryParams.append('t', Date.now().toString());

        const fetchUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}${queryParams.toString()}`;

        const response = await fetch(fetchUrl, {
            method: 'POST', 
            cache: 'no-cache',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const result = await response.json();
        return result;
    } catch (error: any) {
        console.error("Cloud Sync Error:", error);
        return { result: 'error', error: error.message };
    }
};

export const testConnection = async (): Promise<boolean> => {
    try {
        const res = await sendToCloud({ action: 'ping' });
        return !!(res && (res.result === 'success' || res.data === 'Connected'));
    } catch (e) { return false; }
};

export const syncBatchResources = async (batchId: string, resources: BatchResource[]) => {
    const folderName = await getFolderName();
    return await sendToCloud({ action: 'sync_batch_resources', folderName, batchId, data: resources });
};

export const getBatchResourcesFromCloud = async (batchId: string) => {
    const folderName = await getFolderName();
    return await sendToCloud({ action: 'get_batch_resources', folderName, batchId });
};

export const syncAssessmentTasks = async (batchId: string, tasks: AssessmentTask[]) => {
    const folderName = await getFolderName();
    return await sendToCloud({ action: 'sync_assessment_tasks', folderName, batchId, data: tasks });
};

export const getAssessmentTasksFromCloud = async (batchId: string) => {
    const folderName = await getFolderName();
    return await sendToCloud({ action: 'get_assessment_tasks', folderName, batchId });
};

export const syncChallengeLibrary = async (images: ChallengeImage[]) => {
    const folderName = await getFolderName();
    return await sendToCloud({ action: 'sync_challenge_library', folderName, data: images });
};

export const getChallengeLibraryFromCloud = async () => {
    const folderName = await getFolderName();
    return await sendToCloud({ action: 'get_challenge_library', folderName });
};

export const syncStudentData = async (student: Student) => {
    const folderName = await getFolderName();
    return await sendToCloud({ 
        action: 'student_sync', 
        folderName, 
        batchId: student.batch, 
        studentName: student.name, 
        studentId: student.id, 
        data: student 
    });
};

export const syncManyStudents = async (batchId: string, students: Student[]) => {
    const folderName = await getFolderName();
    const results = [];
    for (const s of students) {
        results.push(await syncStudentData(s));
    }
    return { result: 'success', detail: results };
};

export const getStudentSyncData = async (batchId: string, studentId: string, folderNameOverride?: string, urlOverride?: string) => {
    const folderName = folderNameOverride || await getFolderName();
    return await sendToCloud({ 
        action: 'get_student_sync', 
        folderName, 
        batchId, 
        studentId, 
        urlOverride 
    });
};

export const getBatchStudentsFromCloud = async (batchId: string) => {
    const folderName = await getFolderName();
    return await sendToCloud({ action: 'get_batch_students', folderName, batchId });
};

export const uploadFileToCloud = async (base64Data: string, filename: string, mimeType: string) => {
    const folderName = await getFolderName();
    return await sendToCloud({ action: 'upload_file', folderName, data: base64Data, filename, mimeType });
};

export const logAssessmentRecord = async (student: Student, assessment: Assessment) => {
    await sendToCloud({ 
        action: 'log_reflection', 
        sheetName: 'AssessmentReflections', 
        data: { 
            StudentName: student.name, 
            StudentID: student.id, 
            Batch: student.batch, 
            Date: assessment.date, 
            Title: assessment.title, 
            Type: assessment.type, 
            Score: `${assessment.score}/${assessment.maxScore}`, 
            Percentage: `${assessment.percentage}%`, 
            Reflection: assessment.whatWentWell, 
            ActionPlan: assessment.whatToImprove 
        } 
    });
};

export const deleteAssessmentFromCloud = async (student: Student, assessment: Assessment) => {
    return await sendToCloud({
        action: 'delete_row',
        sheetName: 'AssessmentReflections',
        studentId: student.id,
        matchParams: {
            Date: assessment.date,
            Title: assessment.title
        }
    });
};

export const logTermExam = async (student: Student, exam: TermAssessment) => {
    await sendToCloud({ 
        action: 'log_reflection', 
        sheetName: 'TermExamReflections', 
        data: { 
            StudentName: student.name, 
            StudentID: student.id, 
            Batch: student.batch, 
            ExamType: exam.examType, 
            Date: exam.date, 
            Score: `${exam.score}/${exam.maxScore}`, 
            Percentage: `${exam.percentage}%`, 
            Reflection: exam.whatWentWell, 
            ActionPlan: exam.actionPlan 
        } 
    });
};

export const deleteTermExamFromCloud = async (student: Student, exam: TermAssessment) => {
    return await sendToCloud({
        action: 'delete_row',
        sheetName: 'TermExamReflections',
        studentId: student.id,
        matchParams: {
            Date: exam.date,
            ExamType: exam.examType
        }
    });
};

export const backupToCloud = async (): Promise<string> => {
    const folderName = await getFolderName();
    const jsonString = await exportData();
    await sendToCloud({ action: 'backup_db', folderName, data: JSON.parse(jsonString) });
    return `Backup sent to '${folderName}'.`;
};

export const restoreFromCloud = async (): Promise<void> => {
    const folderName = await getFolderName();
    const json = await sendToCloud({ action: 'get_backup', folderName });
    if (json.result === 'error') throw new Error(json.error || "Failed");
    await importData(JSON.stringify(json.data || json));
};
