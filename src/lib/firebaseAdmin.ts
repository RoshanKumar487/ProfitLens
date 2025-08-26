
import admin from 'firebase-admin';

// This function ensures that Firebase Admin is initialized only once.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
      throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please add it to your .env file.');
  }
  
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
    throw new Error('Failed to initialize Firebase Admin SDK. Please check the FIREBASE_SERVICE_ACCOUNT_KEY in your environment variables.');
  }
}

const app = initializeFirebaseAdmin();
export const adminAuth = app.auth();
export const db = app.firestore();
