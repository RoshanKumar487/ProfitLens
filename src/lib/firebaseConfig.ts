
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Ensure getStorage is imported

//const firebaseConfig = {
  //apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  //authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
 // projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  //storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  //messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  //appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
 // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  //databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
//};

const firebaseConfig = {
  apiKey: "AIzaSyDhCyWZPBS6lNNzmp8F90mlyg4ikqtOd3o",
  authDomain: "bizsight-k0icr.firebaseapp.com",
  databaseURL: "https://bizsight-k0icr-default-rtdb.firebaseio.com",
  projectId: "bizsight-k0icr",
  storageBucket: "bizsight-k0icr.firebasestorage.app",
  messagingSenderId: "859842469189",
  appId: "1:859842469189:web:a3487310704050729cb22c"
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

export { app, auth, db, storage }; // Export storage
