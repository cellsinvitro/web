"use client";

import React, { useState, useEffect } from "react";
import CellLineColorPicker from "../CellLineColorPicker";
import {
  LabModel,
  ColorCodeConverter,
  ColorDef,
  CELL_LINE_COLORS,
} from "@/lib/cryosearch/types";

interface ConfigureCellLinesModalProps {
  isOpen: boolean;
  lab: LabModel | null;
  onClose: () => void;
  onSave: (labId: string, updatedCellLines: string[]) => void;
}

export default function ConfigureCellLinesModal({
  isOpen,
  lab,
  onClose,
  onSave,
}: ConfigureCellLinesModalProps) {
  const [cellLines, setCellLines] = useState<string[]>([]);
  const [newInput, setNewInput] = useState("");
  const [selectedColor, setSelectedColor] = useState<ColorDef>(
    CELL_LINE_COLORS[0] as ColorDef
  );
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (lab) {
      setCellLines(lab.allowedCellLine || []);
      setErrorMsg("");
      setNewInput("");
    }
  }, [lab, isOpen]);

  if (!isOpen || !lab) return null;

  const handleAdd = () => {
    const trimmed = newInput.trim();
    if (!trimmed) {
      setErrorMsg("Value cannot be empty!");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 20) {
      setErrorMsg("Length must be between 2 - 20 characters");
      return;
    }
    if (cellLines.length >= 100) {
      setErrorMsg("Maximum 100 cell lines allowed!");
      return;
    }

    const formatted = ColorCodeConverter.formatCellLine(trimmed, selectedColor.code);
    setCellLines([...cellLines, formatted]);
    setNewInput("");
    setErrorMsg("");
  };

  const handleRemove = (index: number) => {
    setCellLines(cellLines.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (cellLines.length === 0) {
      setErrorMsg("Cell line list cannot be empty!");
      return;
    }
    onSave(lab.id, cellLines);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between bg-blue-600 px-6 py-4 text-white">
          <div>
            <h2 className="text-base font-bold">Allowed Cell Lines</h2>
            <p className="text-xs text-blue-100 opacity-90">{lab.name}</p>
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

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
              {errorMsg}
            </div>
          )}

          {/* Add input */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Add Cell Line
              </label>
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-black/20"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                Pick Color
              </button>
            </div>

            {showColorPicker && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <CellLineColorPicker
                  selectedColorCode={selectedColor.code}
                  onSelectColor={(c) => {
                    setSelectedColor(c);
                    setShowColorPicker(false);
                  }}
                />
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                placeholder="Cell line name (e.g. MCF-7)"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-xl border border-blue-600 bg-white px-4 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* List of Cell Lines */}
          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Current Allowed Cell Lines ({cellLines.length})
            </label>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-300 p-2 space-y-1.5">
              {cellLines.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  List is empty!
                </div>
              ) : (
                cellLines.map((line, idx) => {
                  const { name, color } = ColorCodeConverter.parseCellLine(line);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-4 w-5 rounded border border-black/10 shadow-sm"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="font-semibold text-slate-800">{name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(idx)}
                        className="text-slate-400 hover:text-red-600"
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

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-500"
            >
              Update Lab Cell Lines
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
