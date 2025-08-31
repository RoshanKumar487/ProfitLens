// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAWS5WceoKjz90VI9gbYyGnIbBFV4wrSqI",
  authDomain: "authflow-kczzs.firebaseapp.com",
  projectId: "authflow-kczzs",
  storageBucket: "authflow-kczzs.appspot.com",
  messagingSenderId: "251804360718",
  appId: "1:251804360718:web:0429344201c7d2f5bc5c5f"
};


// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
