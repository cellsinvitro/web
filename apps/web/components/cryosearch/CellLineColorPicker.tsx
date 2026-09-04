"use client";

import React from "react";
import { CELL_LINE_COLORS, ColorDef } from "@/lib/cryosearch/types";

interface CellLineColorPickerProps {
  selectedColorCode: number;
  onSelectColor: (color: ColorDef) => void;
}

export default function CellLineColorPicker({
  selectedColorCode,
  onSelectColor,
}: CellLineColorPickerProps) {
  const activeColor: ColorDef =
    CELL_LINE_COLORS.find((c) => c.code === selectedColorCode) ??
    (CELL_LINE_COLORS[0] as ColorDef);

  return (
    <div className="flex flex-col items-center">
      {/* Selected color preview bar */}
      <div
        className="mb-4 flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 px-4 text-xs font-semibold shadow-inner transition-colors"
        style={{
          backgroundColor: activeColor.hex,
          color: activeColor.text,
          borderColor: activeColor.border,
        }}
      >
        <span className="flex items-center gap-2 drop-shadow-sm">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border border-black/20"
            style={{ backgroundColor: activeColor.hex }}
          />
          Selected: {activeColor.name} (Code #{activeColor.code})
        </span>
      </div>

      {/* 20 Swatch Grid matching Flutter CellLineColorPicker */}
      <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-10">
        {CELL_LINE_COLORS.map((c) => {
          const isSelected = c.code === selectedColorCode;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => onSelectColor(c)}
              title={`${c.name} (#${c.code})`}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all hover:scale-110 active:scale-95 ${
                isSelected
                  ? "ring-2 ring-slate-900 ring-offset-2 scale-105 shadow-md"
                  : "hover:shadow-sm"
              }`}
              style={{
                backgroundColor: c.hex,
                borderColor: isSelected ? "#0f172a" : c.border,
              }}
            >
              {isSelected ? (
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                  style={{ color: c.text }}
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span
                  className="text-[10px] font-bold opacity-0 transition-opacity group-hover:opacity-70"
                  style={{ color: c.text }}
                >
                  {c.code}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
