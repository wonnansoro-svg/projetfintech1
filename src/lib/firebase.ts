import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuration Firebase — À remplacer par vos vraies credentials
const firebaseConfig = {
  apiKey: "AIzaSyDemo123456789",
  authDomain: "agrisusu-demo.firebaseapp.com",
  projectId: "agrisusu-demo",
  storageBucket: "agrisusu-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Mode émulateur local pour développement (décommenter si Firebase Emulator installé)
// if (import.meta.env.DEV) {
//   connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
//   connectFirestoreEmulator(db, "localhost", 8080);
// }

export default app;
