
import * as admin from 'firebase-admin';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please add it to your .env file.');
}

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string.', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Please check the FIREBASE_SERVICE_ACCOUNT_KEY in your environment variables.');
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
