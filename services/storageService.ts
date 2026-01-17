
import { Student, BatchResource, ChallengeImage, AssessmentTask, SyllabusPortion } from '../types';
import * as db from './db';

export const getStudents = async (): Promise<Student[]> => {
  return await db.getAllStudents();
};

export const getStudentById = async (id: string): Promise<Student | undefined> => {
  return await db.getStudentById(id);
};

export const updateStudent = async (updatedStudent: Student): Promise<void> => {
  return await db.saveStudent(updatedStudent);
};

export const updateStudentsBatch = async (students: Student[]): Promise<void> => {
    return await db.saveManyStudents(students);
};

export const createStudent = async (newStudent: Student): Promise<void> => {
  return await db.saveStudent(newStudent);
}

export const removeStudent = async (id: string): Promise<void> => {
  return await db.deleteStudent(id);
};

// --- Shared Resources ---
export const addBatchResource = async (resource: BatchResource): Promise<void> => {
    return await db.saveBatchResource(resource);
};

export const getBatchResources = async (batchId: string, topicId: string): Promise<BatchResource[]> => {
    return await db.getBatchResources(batchId, topicId);
};

export const removeBatchResource = async (id: string): Promise<void> => {
    return await db.deleteBatchResource(id);
};

export const saveBatchResourcesList = async (resources: BatchResource[]): Promise<void> => {
    for (const r of resources) {
        await db.saveBatchResource(r);
    }
};

// --- ASSESSMENT TASKS (NEW) ---
export const addAssessmentTask = async (task: AssessmentTask): Promise<void> => {
    return await db.saveAssessmentTask(task);
};

export const getAssessmentTasks = async (batchId: string): Promise<AssessmentTask[]> => {
    return await db.getAssessmentTasks(batchId);
};

export const removeAssessmentTask = async (id: string): Promise<void> => {
    return await db.deleteAssessmentTask(id);
};

export const saveAssessmentTasksList = async (tasks: AssessmentTask[]): Promise<void> => {
    for (const t of tasks) {
        await db.saveAssessmentTask(t);
    }
};

// --- SYLLABUS PORTIONS (NEW) ---
export const addSyllabusPortion = async (portion: SyllabusPortion): Promise<void> => {
    return await db.saveSyllabusPortion(portion);
};

export const getSyllabusPortions = async (batchId: string): Promise<SyllabusPortion[]> => {
    return await db.getSyllabusPortions(batchId);
};

export const removeSyllabusPortion = async (id: string): Promise<void> => {
    return await db.deleteSyllabusPortion(id);
};

// AI Limit Logic (Chat)
export const checkAndIncrementAiUsage = async (student: Student): Promise<{ allowed: boolean, remaining: number }> => {
    const today = new Date().toISOString().split('T')[0];
    const DAILY_LIMIT = 15;

    let usage = student.aiUsage || { date: today, count: 0 };

    if (usage.date !== today) {
        usage = { date: today, count: 0 };
    }

    if (usage.count >= DAILY_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    const newCount = usage.count + 1;
    const updatedUsage = { date: today, count: newCount };
    
    const updatedStudent = { ...student, aiUsage: updatedUsage };
    await db.saveStudent(updatedStudent);

    return { allowed: true, remaining: DAILY_LIMIT - newCount };
};

// Empowerment Quota Logic
export const checkEmpowermentQuota = async (student: Student): Promise<{ allowed: boolean }> => {
    const today = new Date().toISOString().split('T')[0];
    const DAILY_LIMIT = 10; 

    let usage = student.empowermentUsage || { date: today, count: 0 };

    if (usage.date !== today) {
        usage = { date: today, count: 0 };
    }

    if (usage.count >= DAILY_LIMIT) {
        return { allowed: false };
    }

    const newCount = usage.count + 1;
    const updatedUsage = { date: today, count: newCount };
    
    const updatedStudent = { ...student, empowermentUsage: updatedUsage };
    await db.saveStudent(updatedStudent);

    return { allowed: true };
};

// --- Challenge Logic ---

export const awardChallengePoints = async (student: Student, points: number = 10): Promise<void> => {
    const current = student.challengePoints || 0;
    const updated = { ...student, challengePoints: current + points };
    await db.saveStudent(updated);
};

export const getChallengeImages = async (): Promise<ChallengeImage[]> => {
    return await db.getAllChallengeImages();
};

export const addChallengeImage = async (img: ChallengeImage): Promise<void> => {
    return await db.saveChallengeImage(img);
};

export const removeChallengeImage = async (id: string): Promise<void> => {
    return await db.deleteChallengeImage(id);
};

export const resetSystem = async (): Promise<void> => {
    return await db.clearDatabase();
};

export { initDB, exportData, importData } from './db';
