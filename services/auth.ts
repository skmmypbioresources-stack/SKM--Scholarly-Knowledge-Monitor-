
import { Student } from '../types';
import { getStudents, updateStudent } from './storageService';
import { getSetting, saveSetting } from './db';

export interface UserSession {
    type: 'ADMIN' | 'STUDENT';
    studentId?: string; // Only if type is STUDENT
    name: string;
}

const SESSION_KEY = 'skm_user_session';

// Now Async to check DB
export const loginAdmin = async (password: string): Promise<boolean> => {
    try {
        const storedPassword = await getSetting('admin_password');
        // Fallback to 'skm' if something is wrong with DB init, though initDB handles it.
        const validPassword = storedPassword || 'skm'; 
        
        if (password === validPassword) {
            const session: UserSession = { type: 'ADMIN', name: 'Teacher Admin' };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            return true;
        }
        return false;
    } catch (e) {
        console.error("Admin login error", e);
        return false;
    }
};

export const changeAdminPassword = async (newPassword: string): Promise<void> => {
    await saveSetting('admin_password', newPassword);
};

export const loginStudent = async (id: string, password: string): Promise<boolean> => {
    const students = await getStudents();
    const student = students.find(s => s.id === id || s.username === id); // Allow ID or Username
    
    if (student && student.password === password) {
        const session: UserSession = { 
            type: 'STUDENT', 
            studentId: student.id,
            name: student.name 
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return true;
    }
    return false;
};

export const logout = () => {
    localStorage.removeItem(SESSION_KEY);
};

export const getCurrentSession = (): UserSession | null => {
    const json = localStorage.getItem(SESSION_KEY);
    if (!json) return null;
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
};

export const changeStudentPassword = async (studentId: string, newPassword: string): Promise<void> => {
    const students = await getStudents();
    const student = students.find(s => s.id === studentId);
    if (student) {
        const updated = { ...student, password: newPassword };
        await updateStudent(updated);
    }
};

export const isAuthorized = (studentId: string): boolean => {
    const session = getCurrentSession();
    if (!session) return false;
    if (session.type === 'ADMIN') return true;
    if (session.type === 'STUDENT' && session.studentId === studentId) return true;
    return false;
};
