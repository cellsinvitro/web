"use client";

import GlobalLoader, { CellSpinner } from "./GlobalLoader";

export const AdminSpinner = CellSpinner;

export default function AdminLoader({
  fullScreen = false,
  label = "Loading…",
}: {
  fullScreen?: boolean;
  label?: string;
}) {
  return <GlobalLoader fullScreen={fullScreen} label="CellsInVitro" sublabel={label} />;
}
