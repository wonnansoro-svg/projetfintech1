import { createContext, useContext, useState, type ReactNode } from "react";

export type UserRole = "beneficiary" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  village?: string;
  groupName: string;
  role: UserRole;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, groupName: string, role: UserRole) => Promise<void>;
  signup: (data: Omit<AuthUser, "id" | "createdAt">, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("agrisusu_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email: string, _password: string, groupName: string, role: UserRole) => {
    setLoading(true);
    try {
      // Simulation Firebase authentication
      await new Promise((r) => setTimeout(r, 800));

      const newUser: AuthUser = {
        id: "user_" + Date.now(),
        email,
        name: email.split("@")[0],
        groupName,
        role,
        createdAt: new Date().toISOString(),
      };
      setUser(newUser);
      localStorage.setItem("agrisusu_user", JSON.stringify(newUser));
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: Omit<AuthUser, "id" | "createdAt">, _password: string) => {
    setLoading(true);
    try {
      // Simulation Firebase signup
      await new Promise((r) => setTimeout(r, 1000));

      const newUser: AuthUser = {
        ...data,
        id: "user_" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      setUser(newUser);
      localStorage.setItem("agrisusu_user", JSON.stringify(newUser));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("agrisusu_user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
