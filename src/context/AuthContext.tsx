/// ✅ BON : Une seule ligne "import ... from 'firebase/auth'"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import { subscribeToProfile } from '../services/profileService';
import type { Profile } from '../types/firestore';

// La structure de ton utilisateur
interface User {
  id: string;
  email: string | null;
  name: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  profileLoading: boolean;
  login: (email: string, mdp: string) => Promise<void>;
  signup: (email: string, mdp: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  // Ce useEffect écoute les changements de statut de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Utilisateur connecté — le nom affiché vient du profil Firestore
        // (mis à jour dès qu'il est chargé, voir l'effet ci-dessous)
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.email ?? "Agriculteur",
        });
      } else {
        // Utilisateur déconnecté
        setUser(null);
        setProfile(null);
        setProfileLoading(true);
      }
      setLoading(false); // Fin du chargement
    });

    return () => unsubscribe(); // Nettoyage quand le composant est détruit
  }, []);

  // Abonnement au profil bénéficiaire Firestore (null tant qu'il n'existe pas encore)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToProfile(user.id, (p) => {
      setProfile(p);
      setProfileLoading(false);
      if (p) setUser((prev) => (prev ? { ...prev, name: p.fullName } : prev));
    });
    return () => unsubscribe();
  }, [user?.id]);

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

  // Fonction d'inscription
  const signup = async (email: string, mdp: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, mdp);
      // L'utilisateur est créé et connecté automatiquement par Firebase !
    } catch (error) {
      console.error("Erreur de création de compte :", error);
      throw error;
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
    <AuthContext.Provider value={{ user, profile, profileLoading, login, signup, logout, loading }}>
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