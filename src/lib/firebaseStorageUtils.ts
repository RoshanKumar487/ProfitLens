
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebaseConfig';

const storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage.
 * @param file The file to upload.
 * @param path The path in Firebase Storage where the file will be stored.
 * @returns The download URL of the uploaded file.
 */
export async function uploadFileToStorage(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Deletes a file from Firebase Storage.
 * @param path The path of the file to delete.
 */
export async function deleteFileFromStorage(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error: any) {
    // It's common to try to delete a file that doesn't exist, so we can often ignore this error.
    if (error.code !== 'storage/object-not-found') {
      console.error("Error deleting file from storage:", error);
      throw error;
    }
  }
}
