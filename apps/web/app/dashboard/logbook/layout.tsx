"use client";

import { LabWorkspaceProvider } from "@/context/LabWorkspaceContext";

export default function LogbookLayout({ children }: { children: React.ReactNode }) {
  return <LabWorkspaceProvider>{children}</LabWorkspaceProvider>;
}
