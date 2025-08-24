
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error('Firebase admin initialization error: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://profitlenz-68b39-default-rtdb.firebaseio.com"
      });
    } catch (error: any) {
      console.error('Firebase admin initialization error: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string.', error);
    }
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
