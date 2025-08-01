

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, doc, getDoc } from 'firebase/firestore'; // Import doc and getDoc
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Ensure getStorage is imported



const firebaseConfig = {
  apiKey: "AIzaSyAW4JEuIEsVGMMRpQJYaGTf1dzLv_meXx8",
  authDomain: "profitlenz-68b39.firebaseapp.com",
  projectId: "profitlenz-68b39",
  storageBucket: "profitlenz-68b39.firebasestorage.app",
  messagingSenderId: "579389453160",
  appId: "1:579389453160:web:d0e3d42b2b327984775cdd",
  measurementId: "G-9H7V95TDWD"
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



