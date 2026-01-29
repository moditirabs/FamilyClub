import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  User
} from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAXYtyybqtzn-JSY45N955MOr1P2mfem5kL",
  authDomain: "kararaclub-d20a7.firebaseapp.com",
  projectId: "kararaclub-d20a7",
  storageBucket: "kararaclub-d20a7.firebasestorage.app",
  messagingSenderId: "564570740890",
  appId: "1:564570740890:web:5635d5de77ee3fc551a723"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

// Export instances and functions for use in components
export { 
    auth, 
    storage, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile, 
    onAuthStateChanged, 
    signOut,
    ref,
    uploadBytes,
    getDownloadURL
};

export type { User };