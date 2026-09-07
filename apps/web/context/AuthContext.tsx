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
  sendOtpApi,
  verifyOtpApi,
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
  sendOtp: (email: string, purpose?: "LOGIN" | "REGISTRATION" | "PASSWORD_RESET") => Promise<void>;
  loginWithOtp: (email: string, code: string) => Promise<void>;
  register: (name: string, email: string, password: string, code: string) => Promise<void>;
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

  const sendOtp = useCallback(
    async (email: string, purpose: "LOGIN" | "REGISTRATION" | "PASSWORD_RESET" = "REGISTRATION") => {
      await sendOtpApi({ email, purpose });
    },
    []
  );

  const loginWithOtp = useCallback(async (email: string, code: string) => {
    const data = await verifyOtpApi({ email, code, purpose: "LOGIN" });
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, code: string) => {
      const data = await registerUser({ name, email, password, code });
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
        sendOtp,
        loginWithOtp,
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
