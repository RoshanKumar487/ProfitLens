
import * as admin from 'firebase-admin';

let app: admin.app.App;

if (!admin.apps.length) {
    try {
        // The SDK will automatically look for the GOOGLE_APPLICATION_CREDENTIALS
        // environment variable or use the default service account if running in a
        // Firebase or Google Cloud Platform environment.
        app = admin.initializeApp({
            databaseURL: 'https://bizsight-k0icr-default-rtdb.firebaseio.com'
        });
        console.log("Firebase Admin SDK initialized using environment credentials!");
    } catch (error: any) {
        console.error('Firebase Admin SDK Initialization Error:', error);
        // Add more context to the error message to help with debugging
        throw new Error(`Failed to initialize Firebase Admin SDK. This often happens if the GOOGLE_APPLICATION_CREDENTIALS environment variable is not set correctly. Original error: ${error.message}`);
    }
} else {
    app = admin.app();
}

export { app };
