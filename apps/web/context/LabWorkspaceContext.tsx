"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  fetchUserLabs,
  createLabWorkspace,
  type LabWorkspaceItem,
} from "@/lib/api";

type LabWorkspaceContextType = {
  labs: LabWorkspaceItem[];
  activeLab: LabWorkspaceItem | null;
  loading: boolean;
  setActiveLabId: (id: string) => void;
  refreshLabs: () => Promise<void>;
  createNewLab: (name: string, description?: string) => Promise<LabWorkspaceItem>;
};

const LabWorkspaceContext = createContext<LabWorkspaceContextType | undefined>(undefined);

export function LabWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [labs, setLabs] = useState<LabWorkspaceItem[]>([]);
  const [activeLabId, setActiveLabIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshLabs = async () => {
    try {
      setLoading(true);
      const fetched = await fetchUserLabs();
      setLabs(fetched);

      if (fetched.length > 0 && fetched[0]) {
        // If current active lab is still in list, keep it; otherwise pick first
        setActiveLabIdState((prev) => {
          if (prev && fetched.some((l) => l.id === prev)) return prev;
          return fetched[0]?.id || null;
        });
      }
    } catch (err) {
      console.error("Failed to load user lab workspaces:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLabs();
  }, []);

  const setActiveLabId = (id: string) => {
    setActiveLabIdState(id);
  };

  const createNewLab = async (name: string, description?: string) => {
    const created = await createLabWorkspace({ name, description });
    await refreshLabs();
    setActiveLabIdState(created.id);
    return created;
  };

  const activeLab = labs.find((l) => l.id === activeLabId) || labs[0] || null;

  return (
    <LabWorkspaceContext.Provider
      value={{
        labs,
        activeLab,
        loading,
        setActiveLabId,
        refreshLabs,
        createNewLab,
      }}
    >
      {children}
    </LabWorkspaceContext.Provider>
  );
}

export function useLabWorkspace() {
  const context = useContext(LabWorkspaceContext);
  if (!context) {
    throw new Error("useLabWorkspace must be used within a LabWorkspaceProvider");
  }
  return context;
}
