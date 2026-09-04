"use client";

import React, { useState } from "react";
import {
  BoxModel,
  CellElement,
  ColorCodeConverter,
  LabActivityModel,
  CELL_LINE_COLORS,
} from "@/lib/cryosearch/types";

interface BoxViewModalProps {
  isOpen: boolean;
  box: BoxModel | null;
  allowedLabCellLines: string[];
  onClose: () => void;
  onUpdateBoxCells: (
    boxId: string,
    updatedCells: CellElement[],
    activity?: LabActivityModel
  ) => void;
}

export default function BoxViewModal({
  isOpen,
  box,
  allowedLabCellLines,
  onClose,
  onUpdateBoxCells,
}: BoxViewModalProps) {
  const [viewMode, setViewMode] = useState<"view" | "store" | "revive">("view");
  const [selectedCellIndices, setSelectedCellIndices] = useState<number[]>([]);
  const [currentViewingCell, setCurrentViewingCell] = useState<CellElement | null>(null);

  // Store dialog state
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [storeCellLine, setStoreCellLine] = useState(
    allowedLabCellLines[0] || "HeLa%CLC%1"
  );
  const [storePassage, setStorePassage] = useState("1");
  const [storeRemarks, setStoreRemarks] = useState("");
  const [storeRatings, setStoreRatings] = useState(5);
  const [storeDate, setStoreDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [storeError, setStoreError] = useState("");

  // Revive dialog state
  const [isReviveDialogOpen, setIsReviveDialogOpen] = useState(false);
  const [reviveFeedback, setReviveFeedback] = useState("");
  const [reviveDate, setReviveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reviveError, setReviveError] = useState("");

  if (!isOpen || !box) return null;

  const dimension = box.dimension || 9;
  const cells = box.boxCells || [];

  // Active cell being inspected (fallback to first occupied or first cell)
  const activeInspectedCell =
    currentViewingCell || cells.find((c) => !c.isEmpty) || cells[0] || null;

  const handleCellClick = (cell: CellElement) => {
    if (viewMode === "view") {
      setCurrentViewingCell(cell);
    } else if (viewMode === "store") {
      if (cell.isEmpty) {
        if (selectedCellIndices.includes(cell.boxIndex)) {
          setSelectedCellIndices(
            selectedCellIndices.filter((i) => i !== cell.boxIndex)
          );
        } else {
          setSelectedCellIndices([...selectedCellIndices, cell.boxIndex]);
        }
      }
    } else if (viewMode === "revive") {
      if (!cell.isEmpty) {
        if (selectedCellIndices.includes(cell.boxIndex)) {
          setSelectedCellIndices([]);
        } else {
          setSelectedCellIndices([cell.boxIndex]);
          setCurrentViewingCell(cell);
        }
      }
    }
  };

  // Open Store Confirmation Dialog
  const handleProceedStore = () => {
    if (selectedCellIndices.length === 0) {
      alert("Please select at least 1 vacant cell slot on the grid.");
      return;
    }
    setStoreCellLine(allowedLabCellLines[0] || "HeLa%CLC%1");
    setStorePassage("1");
    setStoreRemarks("");
    setStoreRatings(5);
    setStoreDate(new Date().toISOString().split("T")[0]);
    setStoreError("");
    setIsStoreDialogOpen(true);
  };

  // Execute Store
  const handleConfirmStore = () => {
    const passageNum = parseInt(storePassage, 10);
    if (isNaN(passageNum) || passageNum < 0 || passageNum > 99) {
      setStoreError("Valid passage range is 0 - 99");
      return;
    }
    if (!storeRemarks.trim()) {
      setStoreError("Remarks cannot be empty");
      return;
    }
    if (storeRatings === 0) {
      setStoreError("Please select a rating (1-5 stars)");
      return;
    }

    const storedTimestamp = (storeDate ? new Date(storeDate).getTime() : Date.now()).toString();
    const entryId = `entry-${Date.now()}`;

    const updatedCells = cells.map((cell) => {
      if (selectedCellIndices.includes(cell.boxIndex)) {
        return {
          ...cell,
          isEmpty: false,
          name: storeCellLine,
          passage: passageNum,
          remarksWhenStored: storeRemarks.trim(),
          ratingsWhenStored: storeRatings,
          storedOn: storedTimestamp,
          storedBy: "Current User",
          entryId: entryId,
          extractedBy: "",
          extractedOn: "",
          feedbackWhenExtracted: "",
          ratingsWhenExtracted: 0,
        };
      }
      return cell;
    });

    const parsed = ColorCodeConverter.parseCellLine(storeCellLine);
    const activity: LabActivityModel = {
      doneById: "user_current",
      doneByName: "Current User",
      doneByImage: "",
      doneOn: String(Date.now()),
      storedExtractedOn: storedTimestamp,
      activityType: "Stored",
      labName: box.locationNames[0] || "Laboratory",
      containerName: box.locationNames[1] || "Container",
      rackName: box.locationNames[2] || "Rack",
      boxName: box.name,
      boxCells: [...selectedCellIndices].sort((a, b) => a - b),
      cellLine: storeCellLine,
      elementPassage: `P${passageNum}`,
      feedbackWhenExtracted: storeRemarks.trim(),
    };

    onUpdateBoxCells(box.id, updatedCells, activity);
    setIsStoreDialogOpen(false);
    setSelectedCellIndices([]);
    setViewMode("view");
    alert("Cryovials stored successfully!");
  };

  // Open Revive Confirmation Dialog
  const handleProceedRevive = () => {
    if (selectedCellIndices.length === 0) {
      alert("Please select an occupied cryovial to revive.");
      return;
    }
    setReviveFeedback("");
    setReviveDate(new Date().toISOString().split("T")[0]);
    setReviveError("");
    setIsReviveDialogOpen(true);
  };

  // Execute Revive
  const handleConfirmRevive = () => {
    if (!reviveFeedback.trim()) {
      setReviveError("Remarks / feedback cannot be empty");
      return;
    }

    const targetIndex = selectedCellIndices[0];
    const targetCell = cells.find((c) => c.boxIndex === targetIndex);
    if (!targetCell) return;

    if (targetIndex === undefined) return;

    const revivedTimestamp = (reviveDate ? new Date(reviveDate).getTime() : Date.now()).toString();

    const updatedCells = cells.map((cell) => {
      if (cell.boxIndex === targetIndex) {
        return {
          ...cell,
          isEmpty: true,
          name: "",
          passage: 0,
          storedBy: "",
          storedOn: "",
          entryId: "",
          remarksWhenStored: "",
          ratingsWhenStored: 0,
          extractedBy: "Current User",
          extractedOn: revivedTimestamp,
          feedbackWhenExtracted: reviveFeedback.trim(),
          ratingsWhenExtracted: 5,
        };
      }
      return cell;
    });

    const parsed = ColorCodeConverter.parseCellLine(targetCell.name);
    const activity: LabActivityModel = {
      doneById: "user_current",
      doneByName: "Current User",
      doneByImage: "",
      doneOn: String(Date.now()),
      storedExtractedOn: revivedTimestamp,
      activityType: "Revived",
      labName: box.locationNames[0] || "Laboratory",
      containerName: box.locationNames[1] || "Container",
      rackName: box.locationNames[2] || "Rack",
      boxName: box.name,
      boxCells: [targetIndex],
      cellLine: targetCell.name,
      elementPassage: `P${targetCell.passage ?? 0}`,
      feedbackWhenExtracted: reviveFeedback.trim(),
    };

    onUpdateBoxCells(box.id, updatedCells, activity);
    setIsReviveDialogOpen(false);
    setSelectedCellIndices([]);
    setViewMode("view");
    setCurrentViewingCell(null);
    alert("Cryovial revived successfully!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Top App Bar with Pink / Rose branding matching mobile app */}
        <div className="flex items-center justify-between bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 px-6 py-4 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 font-mono text-xs font-bold">
                {dimension}x{dimension}
              </span>
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                {box.name}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-pink-100 opacity-90">
              {box.locationNames.join(" > ")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"
              title="Close Box"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action Mode Toggle Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setViewMode("view");
                setSelectedCellIndices([]);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === "view"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Inspect Mode
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("store");
                setSelectedCellIndices([]);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === "store"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Store Cryovials
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("revive");
                setSelectedCellIndices([]);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === "revive"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path
                  fillRule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.451a.75.75 0 0 0 0-1.5H4.5a.75.75 0 0 0-.75.75v3.75a.75.75 0 0 0 1.5 0v-2.199l.37.37a7 7 0 1 0 10.87-3.834.75.75 0 0 0-1.178.908Z"
                  clipRule="evenodd"
                />
              </svg>
              Revive Cryovials
            </button>
          </div>

          <div className="text-xs text-slate-500">
            {viewMode === "view" && "Click any cell to view full details."}
            {viewMode === "store" &&
              `Select vacant cells to store (${selectedCellIndices.length} selected)`}
            {viewMode === "revive" &&
              `Select an occupied cell to revive (${selectedCellIndices.length} selected)`}
          </div>
        </div>

        {/* Modal Body: Two Column Layout on Desktop */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-12">
          {/* Left Column: Interactive Grid (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="relative rounded-2xl border-2 border-slate-300 bg-slate-100 p-3 shadow-inner">
              <div
                className="grid gap-1 sm:gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${dimension}, minmax(0, 1fr))`,
                  width: dimension === 5 ? 320 : dimension === 9 ? 380 : 410,
                  maxWidth: "100%",
                }}
              >
                {cells.map((cell) => {
                  const isSelected = selectedCellIndices.includes(cell.boxIndex);
                  const isInspected =
                    viewMode === "view" &&
                    activeInspectedCell?.boxIndex === cell.boxIndex;

                  const { name, color } = ColorCodeConverter.parseCellLine(cell.name);

                  // Color determination matching mobile gridBox.dart
                  let bgColor = cell.isEmpty ? "#ffffff" : color.hex;
                  let borderColor = cell.isEmpty ? "#cbd5e1" : color.border;

                  if (isSelected) {
                    bgColor = "#3b82f6";
                    borderColor = "#1d4ed8";
                  }

                  return (
                    <button
                      key={cell.boxIndex}
                      type="button"
                      onClick={() => handleCellClick(cell)}
                      className={`relative flex aspect-square flex-col justify-between rounded-md border p-1 text-left transition-all hover:scale-105 active:scale-95 ${
                        isInspected
                          ? "ring-2 ring-slate-900 ring-offset-1 z-10 scale-105"
                          : ""
                      } ${
                        isSelected
                          ? "ring-2 ring-blue-500 text-white shadow-md"
                          : ""
                      } ${
                        cell.isEmpty
                          ? "bg-white/80 hover:bg-slate-50"
                          : "shadow-xs"
                      }`}
                      style={{
                        backgroundColor: bgColor,
                        borderColor: isSelected ? "#1d4ed8" : borderColor,
                      }}
                      title={`Cell #${cell.boxIndex} ${
                        cell.isEmpty
                          ? "(Vacant)"
                          : `- ${name} (Passage ${cell.passage})`
                      }`}
                    >
                      {/* Cell Line Name on top */}
                      <span
                        className={`truncate text-[9px] font-bold leading-tight ${
                          isSelected
                            ? "text-white"
                            : cell.isEmpty
                            ? "text-slate-400"
                            : "text-slate-950"
                        }`}
                      >
                        {cell.isEmpty ? "-" : name}
                      </span>

                      {/* Passage (left) & Slot Index (right) */}
                      <div className="flex items-end justify-between text-[8px] font-semibold leading-none">
                        <span
                          className={
                            isSelected
                              ? "text-white/90 font-bold"
                              : cell.isEmpty
                              ? "opacity-0"
                              : "text-slate-700 font-bold"
                          }
                        >
                          P{cell.passage}
                        </span>
                        <span
                          className={
                            isSelected
                              ? "text-white/80 font-mono text-[7px]"
                              : "text-slate-400 font-mono text-[7px]"
                          }
                        >
                          {cell.boxIndex}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid Legend & Status */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-slate-300 bg-white" />
                <span>Vacant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-blue-600 bg-blue-500" />
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-100" />
                <span>Occupied Cell</span>
              </div>
            </div>
          </div>

          {/* Right Column: Cell Details & Action Triggers (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            {/* Cell Inspection Card (matching mobile gridBox.dart card) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Cell Inspection Card
                </h3>
                {activeInspectedCell && (
                  <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                    Slot #{activeInspectedCell.boxIndex}
                  </span>
                )}
              </div>

              {activeInspectedCell ? (
                <div className="space-y-2.5 text-xs">
                  {/* Status & Name */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400">Cell Line:</span>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                        {!activeInspectedCell.isEmpty && (
                          <span
                            className="h-3 w-3 rounded-full border border-black/20"
                            style={{
                              backgroundColor: ColorCodeConverter.parseCellLine(
                                activeInspectedCell.name
                              ).color.hex,
                            }}
                          />
                        )}
                        <span>
                          {activeInspectedCell.isEmpty
                            ? "Vacant / Empty Slot"
                            : ColorCodeConverter.parseCellLine(
                                activeInspectedCell.name
                              ).name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400">Passage:</span>
                      <div className="text-sm font-extrabold text-slate-900">
                        {activeInspectedCell.isEmpty
                          ? "-"
                          : `P${activeInspectedCell.passage}`}
                      </div>
                    </div>
                  </div>

                  {/* Stored By & Date */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[11px] text-slate-400">Stored By:</span>
                      <div className="font-medium text-slate-700">
                        {activeInspectedCell.storedBy || "-"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Stored On:</span>
                      <div className="font-medium text-slate-700">
                        {activeInspectedCell.storedOn
                          ? new Date(
                              parseInt(activeInspectedCell.storedOn, 10)
                            ).toLocaleDateString()
                          : "-"}
                      </div>
                    </div>
                  </div>

                  {/* Ratings */}
                  <div>
                    <span className="text-[11px] text-slate-400">Quality Rating:</span>
                    <div className="mt-0.5 flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={`h-4 w-4 ${
                            star <= (activeInspectedCell.ratingsWhenStored || 0)
                              ? "text-amber-400"
                              : "text-slate-200"
                          }`}
                        >
                          <path
                            fillRule="evenodd"
                            d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ))}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <span className="text-[11px] text-slate-400">Remarks / Protocol:</span>
                    <div className="mt-0.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700 leading-relaxed min-h-12">
                      {activeInspectedCell.remarksWhenStored || "No remarks noted for this cell."}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Select a cell to view details
                </div>
              )}
            </div>

            {/* Bottom Actions based on active mode */}
            <div className="mt-6 space-y-3">
              {viewMode === "store" && (
                <button
                  type="button"
                  onClick={handleProceedStore}
                  disabled={selectedCellIndices.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-500 disabled:opacity-50"
                >
                  Confirm Location ({selectedCellIndices.length} selected)
                </button>
              )}

              {viewMode === "revive" && (
                <button
                  type="button"
                  onClick={handleProceedRevive}
                  disabled={selectedCellIndices.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-500 disabled:opacity-50"
                >
                  Revive Selected Cryovial
                </button>
              )}

              {viewMode === "view" && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("store");
                      setSelectedCellIndices([]);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-500"
                  >
                    Store Cryovials
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("revive");
                      setSelectedCellIndices([]);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"
                  >
                    Revive Cryovials
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* STORE CRYOVIALS DIALOG (matching insertElementDialog.dart) */}
        {/* ======================================================= */}
        {isStoreDialogOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-blue-600 px-6 py-4 text-white">
                <div>
                  <h3 className="text-base font-bold">Store Cryovials</h3>
                  <p className="text-xs text-blue-100">
                    Location(s): {selectedCellIndices.join(", ")} ({selectedCellIndices.length} vials)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStoreDialogOpen(false)}
                  className="rounded-lg p-1 text-white/80 hover:bg-white/10"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {storeError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                    {storeError}
                  </div>
                )}

                {/* Cell Line Selector */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Select Cell Line
                  </label>
                  <select
                    value={storeCellLine}
                    onChange={(e) => setStoreCellLine(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {allowedLabCellLines.map((line, i) => {
                      const { name, color } = ColorCodeConverter.parseCellLine(line);
                      return (
                        <option key={i} value={line}>
                          {name} (Color: {color.name})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Passage & Date */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Passage Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        P
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={storePassage}
                        onChange={(e) => setStorePassage(e.target.value)}
                        placeholder="01"
                        className="w-full rounded-xl border border-slate-300 pl-7 pr-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Stored Date
                    </label>
                    <input
                      type="date"
                      value={storeDate}
                      onChange={(e) => setStoreDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Remarks / Freezing Media
                  </label>
                  <textarea
                    rows={2}
                    maxLength={100}
                    value={storeRemarks}
                    onChange={(e) => setStoreRemarks(e.target.value)}
                    placeholder="e.g. 90% FBS + 10% DMSO, 2x10^6 cells/vial"
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="text-right text-[10px] text-slate-400">
                    {storeRemarks.length}/100 characters
                  </div>
                </div>

                {/* Star Ratings */}
                <div className="mb-6">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Quality Rating (1 - 5 Stars)
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setStoreRatings(star)}
                        className="p-1 text-2xl transition-transform hover:scale-125"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={`h-6 w-6 ${
                            star <= storeRatings
                              ? "text-amber-400"
                              : "text-slate-200 hover:text-amber-200"
                          }`}
                        >
                          <path
                            fillRule="evenodd"
                            d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStoreDialogOpen(false)}
                    className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStore}
                    className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-500"
                  >
                    Save & Store Vials
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* REVIVE CRYOVIAL DIALOG (matching extractElementDialog.dart) */}
        {/* ======================================================= */}
        {isReviveDialogOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-emerald-600 px-6 py-4 text-white">
                <div>
                  <h3 className="text-base font-bold">Revive Cryovial</h3>
                  <p className="text-xs text-emerald-100">
                    Slot #{selectedCellIndices[0]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviveDialogOpen(false)}
                  className="rounded-lg p-1 text-white/80 hover:bg-white/10"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {reviveError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                    {reviveError}
                  </div>
                )}

                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Revival Date
                  </label>
                  <input
                    type="date"
                    value={reviveDate}
                    onChange={(e) => setReviveDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Revival Remarks / Post-Thaw Viability
                  </label>
                  <textarea
                    rows={3}
                    maxLength={100}
                    value={reviveFeedback}
                    onChange={(e) => setReviveFeedback(e.target.value)}
                    placeholder="e.g. Thawed at 37°C in water bath for 90s, seeded into T-25 flask with 10mL DMEM. Viability >90%."
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="text-right text-[10px] text-slate-400">
                    {reviveFeedback.length}/100 characters
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviveDialogOpen(false)}
                    className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRevive}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                  >
                    Confirm & Revive
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
