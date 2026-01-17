
import { saveFile as dbSaveFile, getFile as dbGetFile, deleteFile as dbDeleteFile } from './db';

// Wrapper to maintain import paths in components, pointing to the central DB
export const saveFileToStorage = async (file: File): Promise<string> => {
  return await dbSaveFile(file);
};

export const getFileFromStorage = async (id: string) => {
  return await dbGetFile(id);
};

export const removeFileFromStorage = async (id: string) => {
  return await dbDeleteFile(id);
};