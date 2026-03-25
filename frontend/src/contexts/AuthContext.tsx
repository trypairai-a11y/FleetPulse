"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api, { setAccessToken } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenant?: { id: string; name: string };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data } = await api.post("/api/auth/refresh");
      setAccessToken(data.accessToken);
      const { data: me } = await api.get("/api/auth/me");
      setUser(me);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { data } = await api.post("/api/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    await api.post("/api/auth/logout");
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
