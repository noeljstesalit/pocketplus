// src/firebase.js
import { initializeApp }    from 'firebase/app';
import { getAuth }          from 'firebase/auth';
import { getFirestore }     from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDFxFmzI3k9R9JPV3im-Iirk9yiy-F3DD8",
  authDomain: "expense-tracker-348d4.firebaseapp.com",
  projectId: "expense-tracker-348d4",
  storageBucket: "expense-tracker-348d4.firebasestorage.app",
  messagingSenderId: "953310565042",
  appId: "1:953310565042:web:32c626c5d93fd09a77afab",
  measurementId: "G-HKY5SH6637"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
