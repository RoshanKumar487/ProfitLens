
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error) {
        console.error("Failed to parse Firebase service account key:", error);
    }
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Firebase Admin features will be disabled.");
  }
}

export default admin;
