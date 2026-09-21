"use client";

/**
 * NotebookEditor
 *
 * A rich, block-based notebook editor styled as a ruled A5 lab paper page.
 * Blocks are either Text (contentEditable div with inline formatting) or Image.
 * Toolbar: Bold · Italic · Text Color · Highlight · Add Text Box · Add Image Box
 *
 * The editor is fully self-contained — parent passes `blocks` + `onChange`.
 * Images are uploaded via the provided `onImageUpload` callback.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { NotebookBlock, NotebookImageBlock, NotebookTextBlock } from "@/lib/api";

// ─── utilities ───────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyTextBlock(): NotebookTextBlock {
  return { type: "text", id: makeId(), content: "" };
}

// ─── sub-components ──────────────────────────────────────────────────────────

/** Individual text block — uses contentEditable */
function TextBlock({
  block,
  onChange,
  onDelete,
  onEnter,
  autoFocus,
}: {
  block: NotebookTextBlock;
  onChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onEnter: (id: string) => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync initial content from prop (only on mount / block id change)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== block.content) {
      ref.current.innerHTML = block.content;
    }
    if (autoFocus && ref.current) ref.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  const handleInput = () => {
    if (ref.current) onChange(block.id, ref.current.innerHTML);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter(block.id);
    }
    if (e.key === "Backspace" && ref.current && ref.current.innerText === "") {
      e.preventDefault();
      onDelete(block.id);
    }
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      data-placeholder="Write here…"
      className={[
        "min-h-[32px] w-full resize-none border-none bg-transparent",
        "pl-10 text-sm font-medium leading-8 text-slate-900 focus:outline-none",
        "empty:before:text-slate-300 empty:before:content-[attr(data-placeholder)]",
      ].join(" ")}
      style={{ backgroundImage: "none", lineHeight: "32px" }}
    />
  );
}

/** Individual image block */
function ImageBlock({
  block,
  onChange,
  onDelete,
}: {
  block: NotebookImageBlock;
  onChange: (id: string, partial: Partial<NotebookImageBlock>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group relative my-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.url}
        alt={block.caption || "Notebook image"}
        className="max-h-72 w-full rounded-lg object-contain"
        style={{ maxWidth: block.width ? `${block.width}%` : "100%" }}
      />
      <input
        type="text"
        value={block.caption || ""}
        onChange={(e) => onChange(block.id, { caption: e.target.value })}
        placeholder="Add caption…"
        className="mt-1 w-full border-none bg-transparent text-center text-xs text-slate-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onDelete(block.id)}
        className="absolute right-2 top-2 hidden rounded-lg bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 group-hover:flex"
        title="Remove image"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── toolbar button ───────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={[
        "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-colors",
        active
          ? "bg-slate-950 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export type NotebookEditorProps = {
  blocks: NotebookBlock[];
  onChange: (blocks: NotebookBlock[]) => void;
  onImageUpload: (file: File) => Promise<{ url: string; storageKey: string }>;
  readOnly?: boolean;
  authorName?: string;
  dateLabel?: string;
};

export default function NotebookEditor({
  blocks,
  onChange,
  onImageUpload,
  readOnly = false,
  authorName,
  dateLabel,
}: NotebookEditorProps) {
  // Which block id should auto-focus on next render
  const [focusId, setFocusId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Ensure there's always at least one text block
  const safeBlocks: NotebookBlock[] =
    blocks.length === 0 ? [emptyTextBlock()] : blocks;

  // ── block manipulation helpers ──────────────────────────────────────────────

  const updateBlock = useCallback(
    (id: string, patch: Partial<NotebookBlock>) => {
      onChange(
        safeBlocks.map((b) => (b.id === id ? { ...b, ...patch } as NotebookBlock : b))
      );
    },
    [safeBlocks, onChange]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      const remaining = safeBlocks.filter((b) => b.id !== id);
      onChange(remaining.length === 0 ? [emptyTextBlock()] : remaining);
    },
    [safeBlocks, onChange]
  );

  const insertTextAfter = useCallback(
    (afterId: string) => {
      const nb = emptyTextBlock();
      const idx = safeBlocks.findIndex((b) => b.id === afterId);
      const next = [...safeBlocks];
      next.splice(idx + 1, 0, nb);
      onChange(next);
      setFocusId(nb.id);
    },
    [safeBlocks, onChange]
  );

  const addTextBlock = () => {
    const nb = emptyTextBlock();
    onChange([...safeBlocks, nb]);
    setFocusId(nb.id);
  };

  // ── formatting commands ──────────────────────────────────────────────────────

  const execFmt = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
  };

  const handleColor = (color: string) => {
    execFmt("foreColor", color);
    setShowColorPicker(false);
  };

  const handleHighlight = (color: string) => {
    execFmt("hiliteColor", color);
    setShowHighlightPicker(false);
  };

  // ── image handling ───────────────────────────────────────────────────────────

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    setUploading(true);
    try {
      const result = await onImageUpload(file);
      const imgBlock: NotebookImageBlock = {
        type: "image",
        id: makeId(),
        url: result.url,
        storageKey: result.storageKey,
        caption: "",
        width: 100,
      };
      onChange([...safeBlocks, imgBlock]);
    } catch {
      alert("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const TEXT_COLORS = [
    "#0f172a", "#dc2626", "#16a34a", "#2563eb", "#9333ea",
    "#ea580c", "#0891b2", "#be185d", "#ca8a04", "#64748b",
  ];

  const HIGHLIGHT_COLORS = [
    "#fef9c3", "#fce7f3", "#dcfce7", "#dbeafe", "#fde8d8",
    "#f3e8ff", "#cffafe", "#fee2e2", "transparent",
  ];

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-amber-50/30 shadow-md">
      {/* Header band */}
      <div className="flex items-center justify-between border-b-2 border-amber-300/70 bg-amber-100/50 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 text-[10px] font-black text-amber-800">
            A5
          </span>
          <div>
            <p className="text-xs font-bold text-slate-900">LABORATORY NOTEBOOK</p>
            {authorName && (
              <p className="text-[10px] text-slate-500">Author: {authorName}</p>
            )}
          </div>
        </div>
        {dateLabel && (
          <span className="text-xs font-semibold text-slate-500">{dateLabel}</span>
        )}
      </div>

      {/* Toolbar (hidden in readOnly) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-amber-200/80 bg-white/60 px-3 py-1.5">
          {/* Bold */}
          <ToolbarBtn onClick={() => execFmt("bold")} title="Bold (Ctrl+B)">
            <strong>B</strong>
          </ToolbarBtn>
          {/* Italic */}
          <ToolbarBtn onClick={() => execFmt("italic")} title="Italic (Ctrl+I)">
            <em>I</em>
          </ToolbarBtn>
          {/* Underline */}
          <ToolbarBtn onClick={() => execFmt("underline")} title="Underline">
            <span className="underline">U</span>
          </ToolbarBtn>

          <span className="mx-1 h-5 w-px bg-slate-200" />

          {/* Text color */}
          <div className="relative">
            <ToolbarBtn
              onClick={() => { setShowColorPicker((v) => !v); setShowHighlightPicker(false); }}
              title="Text Color"
            >
              <span className="flex flex-col items-center gap-0">
                <span className="text-[10px] font-bold leading-none">A</span>
                <span className="h-1 w-4 rounded-sm bg-current" />
              </span>
            </ToolbarBtn>
            {showColorPicker && (
              <div className="absolute left-0 top-8 z-50 flex gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleColor(c); }}
                    className="h-5 w-5 rounded-md border border-slate-200 shadow-xs"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Highlight / Background color */}
          <div className="relative">
            <ToolbarBtn
              onClick={() => { setShowHighlightPicker((v) => !v); setShowColorPicker(false); }}
              title="Highlight / Background"
            >
              <span className="flex flex-col items-center gap-0">
                <span className="text-[10px] font-bold leading-none">H</span>
                <span className="h-1 w-4 rounded-sm bg-yellow-300" />
              </span>
            </ToolbarBtn>
            {showHighlightPicker && (
              <div className="absolute left-0 top-8 z-50 flex gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleHighlight(c); }}
                    className="h-5 w-5 rounded-md border border-slate-200 shadow-xs"
                    style={{ backgroundColor: c === "transparent" ? "white" : c }}
                    title={c === "transparent" ? "Remove highlight" : c}
                  >
                    {c === "transparent" && (
                      <span className="text-[8px] text-slate-400">✕</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="mx-1 h-5 w-px bg-slate-200" />

          {/* Add Text Box */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); addTextBlock(); }}
            title="Add Text Box"
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Text
          </button>

          {/* Add Image Box — gallery */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
            disabled={uploading}
            title="Add Image from Gallery"
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m2.25 15.75 5.16-5.16a2.25 2.25 0 0 1 3.18 0l5.16 5.16m-1.5-1.5 1.41-1.41a2.25 2.25 0 0 1 3.18 0l2.91 2.91M3 3h18v18H3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {uploading ? "Uploading…" : "Image"}
          </button>

          {/* Add Image Box — camera */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); cameraInputRef.current?.click(); }}
            disabled={uploading}
            title="Capture from Camera"
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316ZM16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Camera
          </button>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef as RefObject<HTMLInputElement>}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageFiles(e.target.files)}
          />
          <input
            ref={cameraInputRef as RefObject<HTMLInputElement>}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleImageFiles(e.target.files)}
          />
        </div>
      )}

      {/* Ruled paper area */}
      <div
        className="relative px-5 py-4 sm:px-8 sm:py-6"
        onClick={() => { setShowColorPicker(false); setShowHighlightPicker(false); }}
      >
        {/* Red margin line */}
        <div className="pointer-events-none absolute bottom-0 left-9 top-0 w-px bg-rose-300/50 sm:left-12" />

        {/* Ruled lines background on text blocks */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(transparent 31px, rgba(203,213,225,0.45) 32px)",
            backgroundSize: "100% 32px",
          }}
        />

        <div className="relative space-y-0">
          {safeBlocks.map((block) => {
            if (block.type === "text") {
              return (
                <TextBlock
                  key={block.id}
                  block={block}
                  autoFocus={block.id === focusId}
                  onChange={(id, content) => updateBlock(id, { content })}
                  onDelete={deleteBlock}
                  onEnter={insertTextAfter}
                />
              );
            }
            if (block.type === "image") {
              return (
                <ImageBlock
                  key={block.id}
                  block={block}
                  onChange={(id, partial) => updateBlock(id, partial)}
                  onDelete={readOnly ? () => {} : deleteBlock}
                />
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t border-amber-200 bg-amber-100/30 px-5 py-2 text-[10px] text-slate-400">
        <span>{dateLabel || "Lab Notebook"}</span>
        <span>CellsInVitro Logbook • Confidential</span>
      </div>
    </div>
  );
}
