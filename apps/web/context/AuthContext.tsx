"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updateProfile,
} from "@/lib/api";
import type { AuthUser, Designation } from "@/lib/auth-storage";

type ProfileUpdateInput = {
  name?: string;
  designation?: Designation | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchCurrentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginUser({ email, password });
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await registerUser({ name, email, password });
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const updateProfileFields = useCallback(async (input: ProfileUpdateInput) => {
    const updated = await updateProfile(input);
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile: updateProfileFields,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
