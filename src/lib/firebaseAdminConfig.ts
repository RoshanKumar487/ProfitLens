
import * as admin from 'firebase-admin';

const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_CLIENT_X509_CERT_URL',
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  throw new Error(
    `Firebase Admin SDK Error: The following required environment variables are not set: ${missingVars.join(', ')}. Please check your environment configuration.`
  );
}

const serviceAccount = {
    "type": "service_account",
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    // The key is often stored with escaped newlines. This replaces them with actual newlines.
    "private_key": (process.env.FIREBASE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
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
        // Add more context to the error message to help with debugging
        throw new Error(`Failed to initialize Firebase Admin SDK. This often happens if the service account credentials, especially the private key, are malformed. Please verify them in your environment variables. Original error: ${error.message}`);
    }
} else {
    app = admin.app();
}

export { app };
