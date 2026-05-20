// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase'; // Importe le auth depuis le fichier qu'on vient de créer

// La structure de ton utilisateur
interface User {
  id: string;
  email: string | null;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, mdp: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ce useEffect écoute les changements de statut de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Utilisateur connecté
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: "Agriculteur", // On pourra changer ça plus tard avec une base de données
        });
      } else {
        // Utilisateur déconnecté
        setUser(null);
      }
      setLoading(false); // Fin du chargement
    });

    return () => unsubscribe(); // Nettoyage quand le composant est détruit
  }, []);

  // Fonction de connexion
  const login = async (email: string, mdp: string) => {
    try {
      // Firebase s'occupe de tout vérifier
      await signInWithEmailAndPassword(auth, email, mdp);
      // NB: Pas besoin de faire setUser ici, le onAuthStateChanged (plus haut) s'en occupe automatiquement !
    } catch (error) {
      console.error("Erreur de connexion Firebase :", error);
      throw error; // Renvoie l'erreur pour pouvoir l'afficher sur l'écran de connexion
    }
  };

  // Fonction de déconnexion
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erreur de déconnexion :", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {/* On n'affiche l'application que lorsque Firebase a fini de vérifier la session */}
      {!loading && children} 
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
};