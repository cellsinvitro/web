"use client";

import React, { useState } from "react";
import CellLineColorPicker from "../CellLineColorPicker";
import { ColorCodeConverter, ColorDef, CELL_LINE_COLORS } from "@/lib/cryosearch/types";

interface CreateLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLab: (labName: string, allowedCellLines: string[]) => void;
}

export default function CreateLabModal({
  isOpen,
  onClose,
  onCreateLab,
}: CreateLabModalProps) {
  const [labName, setLabName] = useState("");
  const [cellLineInput, setCellLineInput] = useState("");
  const [selectedColor, setSelectedColor] = useState<ColorDef>(
    CELL_LINE_COLORS[1] as ColorDef
  ); // Default to Blue (#1)
  const [allowedCellLines, setAllowedCellLines] = useState<string[]>([
    "HeLa%CLC%1",
    "HEK293%CLC%5",
    "MCF-7%CLC%11",
    "Vero%CLC%9",
  ]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleAddCellLine = () => {
    const trimmed = cellLineInput.trim();
    if (!trimmed) {
      setErrorMsg("Cell line name cannot be empty");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 20) {
      setErrorMsg("Cell line name must be between 2 and 20 characters");
      return;
    }
    if (allowedCellLines.length >= 100) {
      setErrorMsg("Maximum 100 cell lines allowed");
      return;
    }

    const formatted = ColorCodeConverter.formatCellLine(trimmed, selectedColor.code);
    setAllowedCellLines([...allowedCellLines, formatted]);
    setCellLineInput("");
    setErrorMsg("");
  };

  const handleRemoveCellLine = (index: number) => {
    setAllowedCellLines(allowedCellLines.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLab = labName.trim();
    if (!trimmedLab) {
      setErrorMsg("Laboratory name cannot be empty");
      return;
    }
    if (trimmedLab.length < 2 || trimmedLab.length > 25) {
      setErrorMsg("Lab name must be between 2 and 25 characters");
      return;
    }
    if (allowedCellLines.length === 0) {
      setErrorMsg("Please add at least one allowed cell line");
      return;
    }

    onCreateLab(trimmedLab, allowedCellLines);
    setLabName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
            </svg>
            <h2 className="text-lg font-bold tracking-tight">Create New Laboratory</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
              {errorMsg}
            </div>
          )}

          {/* Lab Name Input */}
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Laboratory Name
            </label>
            <input
              type="text"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="e.g. Stem Cell & Gene Therapy Lab"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              required
            />
          </div>

          {/* Add Cell Line Section */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Add Allowed Cell-Lines
              </label>
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
              >
                <span
                  className="h-3 w-3 rounded-full border border-black/20"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                Color: {selectedColor.name}
              </button>
            </div>

            {showColorPicker && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <CellLineColorPicker
                  selectedColorCode={selectedColor.code}
                  onSelectColor={(c: ColorDef) => {
                    setSelectedColor(c);
                    setShowColorPicker(false);
                  }}
                />
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={cellLineInput}
                onChange={(e) => setCellLineInput(e.target.value)}
                placeholder="Cell line name (e.g. HeLa, HEK293)"
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCellLine();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCellLine}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
              >
                + Add
              </button>
            </div>
          </div>

          {/* List of Allowed Cell Lines */}
          <div className="mb-6">
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
              <span>Configured Cell Lines ({allowedCellLines.length})</span>
              <span className="text-[11px]">Click trash to remove</span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 space-y-1.5">
              {allowedCellLines.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No cell lines added yet. Add at least one above.
                </div>
              ) : (
                allowedCellLines.map((item, idx) => {
                  const { name, color } = ColorCodeConverter.parseCellLine(item);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-200/80 px-3 py-1.5 text-xs transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-4 w-5 rounded border shadow-sm"
                          style={{
                            backgroundColor: color.hex,
                            borderColor: color.border,
                          }}
                        />
                        <span className="font-semibold text-slate-800">{name}</span>
                        <span className="text-[10px] text-slate-400">
                          (Code #{color.code} - {color.name})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCellLine(idx)}
                        className="rounded p-1 text-slate-400 hover:text-red-600"
                        title="Delete Cell Line"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .75.75v7a.75.75 0 0 1-1.5 0v-7a.75.75 0 0 1 .75-.75Zm3.59 0a.75.75 0 0 1 .75.75v7a.75.75 0 0 1-1.5 0v-7a.75.75 0 0 1 .75-.75Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:from-pink-500 hover:to-rose-500"
            >
              Create Laboratory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
