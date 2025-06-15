
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebaseConfig'; // Your Firebase storage instance

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload.
 * @param path The path in Firebase Storage where the file should be stored (e.g., 'employees/avatars/userId.png').
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

/**
 * Deletes a file from Firebase Storage.
 * @param filePath The full path to the file in Firebase Storage (e.g., 'employees/avatars/userId.png').
 * @returns A promise that resolves when the file is deleted.
 */
export const deleteFileFromStorage = async (filePath: string): Promise<void> => {
  if (!filePath) {
    console.warn("deleteFileFromStorage called with empty or null filePath.");
    return;
  }
  // Attempt to create a ref from a GS or HTTPS URL, or a direct path
  let storageRef;
  if (filePath.startsWith('gs://') || filePath.startsWith('https://firebasestorage.googleapis.com')) {
    storageRef = ref(storage, filePath);
  } else {
    // Assume it's a direct path if not a URL
    storageRef = ref(storage, filePath);
  }
  
  try {
    await deleteObject(storageRef);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`File not found for deletion at path: ${filePath}`);
    } else {
      console.error("Error deleting file from Firebase Storage:", error);
      throw error; 
    }
  }
};
