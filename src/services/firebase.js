import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA1e8Y-5yUOzHn7x7hMCfDBCRQRQWd6C6k",
  authDomain: "attendance-app-3e06e.firebaseapp.com",
  projectId: "attendance-app-3e06e",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);