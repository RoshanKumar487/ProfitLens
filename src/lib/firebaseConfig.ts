

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, doc, getDoc } from 'firebase/firestore'; // Import doc and getDoc
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Ensure getStorage is imported



const firebaseConfig = {
  apiKey: "AIzaSyBlPZet8aJ8zT9_h8iQo1d_fGf0V0",
  authDomain: "profitlens-33431.firebaseapp.com",
  projectId: "profitlens-33431",
  storageBucket: "profitlens-33431.appspot.com",
  messagingSenderId: "334254247291",
  appId: "1:334254247291:web:12701181f3306917f8b929"
};


let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage; // Declare storage variable

if (!getApps().length) {
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.projectId
  ) {
    console.error(
      'CRITICAL: Firebase API Key, Auth Domain, or Project ID is missing. Check your .env file and Firebase project settings.'
    );
  }
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error('CRITICAL: Firebase App initialization failed.', e);
    console.error('Ensure your .env file has all NEXT_PUBLIC_FIREBASE_... variables correctly set from your Firebase project console.');
    throw new Error("Firebase initialization failed. Check .env variables.");
  }
} else {
  app = getApp();
}

try {
  auth = getAuth(app);
} catch (e) {
  console.error('CRITICAL: Firebase Auth initialization failed.', e);
  throw new Error("Firebase Auth initialization failed.");
}

try {
  db = getFirestore(app);
} catch (e) {
  console.error('CRITICAL: Firestore initialization failed.', e);
  throw new Error("Firestore initialization failed.");
}

try {
  storage = getStorage(app); // Initialize storage
} catch (e) {
  console.error('CRITICAL: Firebase Storage initialization failed.', e);
  throw new Error("Firebase Storage initialization failed.");
}

export { app, auth, db, storage, doc, getDoc }; // Export doc and getDoc

