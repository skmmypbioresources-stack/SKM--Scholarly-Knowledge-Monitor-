
import { Student, Topic, Assessment, Resource, BatchResource, ChallengeImage, AssessmentTask, SyllabusPortion, PeerMarkingTask } from '../types';

const DB_NAME = 'SKM_Persistent_DB_v1';
// Incremented version to 37 to add peer_marking store
const DB_VERSION = 37; 
const STORE_STUDENTS = 'students';
const STORE_FILES = 'files';
const STORE_SETTINGS = 'settings';
const STORE_BATCH_RESOURCES = 'batch_resources';
const STORE_CHALLENGE_IMAGES = 'challenge_images';
const STORE_ASSESSMENT_TASKS = 'assessment_tasks'; 
const STORE_SYLLABUS_PORTIONS = 'syllabus_portions'; 
const STORE_PEER_MARKING = 'peer_marking';

// Mock Data Imports
import { INITIAL_TOPICS_IGCSE, INITIAL_TOPICS_MYP, MOCK_STUDENTS } from './mockData';

interface StoredFile {
  id: string;
  file: Blob;
  name: string;
  type: string;
  date: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_STUDENTS)) db.createObjectStore(STORE_STUDENTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_FILES)) db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS);
      if (!db.objectStoreNames.contains(STORE_BATCH_RESOURCES)) {
          const store = db.createObjectStore(STORE_BATCH_RESOURCES, { keyPath: 'id' });
          store.createIndex('batchId', 'batchId', { unique: false });
          store.createIndex('topicId', 'topicId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_CHALLENGE_IMAGES)) {
          db.createObjectStore(STORE_CHALLENGE_IMAGES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ASSESSMENT_TASKS)) {
          db.createObjectStore(STORE_ASSESSMENT_TASKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SYLLABUS_PORTIONS)) {
          db.createObjectStore(STORE_SYLLABUS_PORTIONS, { keyPath: 'id' });
      }
      // Added Peer Marking store in migration
      if (!db.objectStoreNames.contains(STORE_PEER_MARKING)) {
          db.createObjectStore(STORE_PEER_MARKING, { keyPath: 'id' });
      }
    };
  });
};

export const initDB = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_STUDENTS, STORE_SETTINGS], 'readwrite');
    const studentStore = transaction.objectStore(STORE_STUDENTS);
    
    const countReq = studentStore.count();
    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        MOCK_STUDENTS.forEach(student => studentStore.add(student));
      }
    };

    const settingsStore = transaction.objectStore(STORE_SETTINGS);
    
    // Check Admin Password
    const adminPwRequest = settingsStore.get('admin_password');
    adminPwRequest.onsuccess = () => {
        if (!adminPwRequest.result) settingsStore.put('skm', 'admin_password');
    };

    // Ensure Cloud URL is pre-set
    const cloudUrlRequest = settingsStore.get('cloud_script_url');
    cloudUrlRequest.onsuccess = () => {
        const teacherProvidedUrl = 'https://script.google.com/macros/s/AKfycbwhB6X5TvvTwkHeAkmvISbNy6a8RPnEdWhqfEhQXDlGOGV-jsbMijaD_liLsoguSFGC/exec';
        if (!cloudUrlRequest.result) {
            settingsStore.put(teacherProvidedUrl, 'cloud_script_url');
        }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getStoreData = async <T>(storeName: string): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const saveStoreItem = async (storeName: string, item: any): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.put(item);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const deleteStoreItem = async (storeName: string, id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getAllStudents = async () => getStoreData<Student>(STORE_STUDENTS);
export const getStudentById = async (id: string): Promise<Student | undefined> => {
  const students = await getAllStudents();
  return students.find(s => s.id === id);
};
export const saveStudent = async (s: Student) => saveStoreItem(STORE_STUDENTS, s);
export const saveManyStudents = async (students: Student[]) => {
    const db = await openDB();
    const tx = db.transaction(STORE_STUDENTS, 'readwrite');
    students.forEach(s => tx.objectStore(STORE_STUDENTS).put(s));
};
export const deleteStudent = async (id: string) => deleteStoreItem(STORE_STUDENTS, id);

export const saveBatchResource = async (r: BatchResource) => saveStoreItem(STORE_BATCH_RESOURCES, r);
export const getBatchResources = async (batchId: string, topicId: string): Promise<BatchResource[]> => {
    const all = await getStoreData<BatchResource>(STORE_BATCH_RESOURCES);
    if (!topicId) return all.filter(r => r.batchId === batchId);
    return all.filter(r => r.batchId === batchId && r.topicId === topicId);
};
export const deleteBatchResource = async (id: string) => deleteStoreItem(STORE_BATCH_RESOURCES, id);

export const saveChallengeImage = async (i: ChallengeImage) => saveStoreItem(STORE_CHALLENGE_IMAGES, i);
export const getAllChallengeImages = async () => getStoreData<ChallengeImage>(STORE_CHALLENGE_IMAGES);
export const deleteChallengeImage = async (id: string) => deleteStoreItem(STORE_CHALLENGE_IMAGES, id);

export const saveAssessmentTask = async (t: AssessmentTask) => saveStoreItem(STORE_ASSESSMENT_TASKS, t);
export const getAssessmentTasks = async (batchId: string): Promise<AssessmentTask[]> => {
    const all = await getStoreData<AssessmentTask>(STORE_ASSESSMENT_TASKS);
    return all.filter(t => t.batchId === batchId);
};
export const deleteAssessmentTask = async (id: string) => deleteStoreItem(STORE_ASSESSMENT_TASKS, id);

export const saveSyllabusPortion = async (p: SyllabusPortion) => saveStoreItem(STORE_SYLLABUS_PORTIONS, p);
export const getSyllabusPortions = async (batchId: string): Promise<SyllabusPortion[]> => {
    const all = await getStoreData<SyllabusPortion>(STORE_SYLLABUS_PORTIONS);
    return all.filter(p => p.batchId === batchId);
};
export const deleteSyllabusPortion = async (id: string) => deleteStoreItem(STORE_SYLLABUS_PORTIONS, id);

// Added Peer Marking DB handlers
export const getPeerMarkingTasks = async (batchId: string): Promise<PeerMarkingTask[]> => {
    const all = await getStoreData<PeerMarkingTask>(STORE_PEER_MARKING);
    return all.filter(t => t.batchId === batchId);
};
export const savePeerMarkingTask = async (t: PeerMarkingTask) => saveStoreItem(STORE_PEER_MARKING, t);
export const savePeerMarkingTasksList = async (tasks: PeerMarkingTask[]) => {
    const db = await openDB();
    const tx = db.transaction(STORE_PEER_MARKING, 'readwrite');
    tasks.forEach(t => tx.objectStore(STORE_PEER_MARKING).put(t));
};

export const saveFile = async (file: File): Promise<string> => {
  const db = await openDB();
  const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FILES, 'readwrite');
    const store = transaction.objectStore(STORE_FILES);
    store.add({ id, file, name: file.name, type: file.type, date: Date.now() });
    transaction.oncomplete = () => resolve(id);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getFile = async (id: string): Promise<StoredFile | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FILES, 'readonly');
    const store = transaction.objectStore(STORE_FILES);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const deleteFile = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FILES, 'readwrite');
    const store = transaction.objectStore(STORE_FILES);
    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getSetting = async (key: string): Promise<any> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_SETTINGS, 'readonly');
        const store = transaction.objectStore(STORE_SETTINGS);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveSetting = async (key: string, value: any): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_SETTINGS, 'readwrite');
        const store = transaction.objectStore(STORE_SETTINGS);
        store.put(value, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const updateLastBackupTime = async (): Promise<void> => {
    await saveSetting('last_backup_timestamp', Date.now());
};

export const clearDatabase = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const stores = [STORE_STUDENTS, STORE_FILES, STORE_BATCH_RESOURCES, STORE_CHALLENGE_IMAGES, STORE_ASSESSMENT_TASKS, STORE_SYLLABUS_PORTIONS, STORE_PEER_MARKING];
        const transaction = db.transaction(stores, 'readwrite');
        stores.forEach(s => transaction.objectStore(s).clear());
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const exportData = async (): Promise<string> => {
    const students = await getAllStudents();
    const batchRes = await getStoreData(STORE_BATCH_RESOURCES);
    const tasks = await getStoreData(STORE_ASSESSMENT_TASKS);
    const portions = await getStoreData(STORE_SYLLABUS_PORTIONS);
    const peerMarking = await getStoreData(STORE_PEER_MARKING);

    return JSON.stringify({
        version: DB_VERSION,
        date: new Date().toISOString(),
        students,
        batch_resources: batchRes,
        assessment_tasks: tasks,
        syllabus_portions: portions,
        peer_marking: peerMarking
    }, null, 2);
};

export const importData = async (jsonString: string): Promise<void> => {
    const data = JSON.parse(jsonString);
    const db = await openDB();
    const stores = [STORE_STUDENTS, STORE_BATCH_RESOURCES, STORE_ASSESSMENT_TASKS, STORE_SYLLABUS_PORTIONS, STORE_PEER_MARKING];
    const transaction = db.transaction(stores, 'readwrite');
    
    stores.forEach(s => transaction.objectStore(s).clear());

    if (data.students) data.students.forEach((s: any) => transaction.objectStore(STORE_STUDENTS).add(s));
    if (data.batch_resources) data.batch_resources.forEach((r: any) => transaction.objectStore(STORE_BATCH_RESOURCES).add(r));
    if (data.assessment_tasks) data.assessment_tasks.forEach((t: any) => transaction.objectStore(STORE_ASSESSMENT_TASKS).add(t));
    if (data.syllabus_portions) data.syllabus_portions.forEach((p: any) => transaction.objectStore(STORE_SYLLABUS_PORTIONS).add(p));
    if (data.peer_marking) data.peer_marking.forEach((p: any) => transaction.objectStore(STORE_PEER_MARKING).add(p));
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};