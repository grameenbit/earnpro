import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDseP_tMV5wIlMJLIzMPlUsQ68d3QUDEd4",
    authDomain: "clinentad.firebaseapp.com",
    projectId: "clinentad",
    storageBucket: "clinentad.firebasestorage.app",
    messagingSenderId: "826636200130",
    appId: "1:826636200130:web:04c5ee279a9a879055f35b"
};

// Initialize Firebase with modular SDK
// Check if apps are already initialized to avoid errors in hot-reload environments
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Export auth and db
export const auth = getAuth(app);
export const db = getFirestore(app);