
import * as admin from 'firebase-admin';

// Ensure the private key is defined and is a string.
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (!privateKey) {
  throw new Error(
    'Firebase Admin SDK Error: The FIREBASE_PRIVATE_KEY environment variable is not set.'
  );
}

const serviceAccount = {
    "type": "service_account",
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    // The key is often stored with escaped newlines. This replaces them with actual newlines.
    "private_key": privateKey.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
};

let app: admin.app.App;

if (!admin.apps.length) {
    try {
        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
        });
    } catch (error: any) {
        console.error('Firebase Admin SDK Initialization Error:', error);
        throw new Error('Failed to initialize Firebase Admin SDK. Please check that your service account credentials (especially the private key) are correctly configured in your environment variables.');
    }
} else {
    app = admin.app();
}

export { app };
