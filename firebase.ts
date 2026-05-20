// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // <-- On ajoute ça pour l'authentification

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "fintech-f4dee.firebaseapp.com",
  projectId: "fintech-f4dee",
  storageBucket: "fintech-f4dee.firebasestorage.app",
  messagingSenderId: "683189698437",
  appId: "1:683189698437:web:4660db484bd377a1298eec",
  measurementId: "G-NSF5PPM5KJ"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// On exporte 'auth' pour pouvoir l'utiliser n'importe où dans l'application
export const auth = getAuth(app);