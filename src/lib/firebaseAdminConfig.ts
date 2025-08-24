
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please add it to your .env file.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
    // Throw a more descriptive error to make the problem clear.
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it's a valid JSON string. Original error: ${error.message}`);
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
