"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KitModuleNode } from "@/lib/api";

const COLLAPSED_COUNT = 3;

type Props = {
  tree: KitModuleNode[];
  ungroupedKits?: KitModuleNode["kits"];
  admin?: boolean;
  /** When true, disables the collapsed preview and always shows all kits (e.g. dashboard pages) */
  showAll?: boolean;
  onAdd?: (parentId: string | null) => void;
  onEdit?: (module: KitModuleNode) => void;
  onDelete?: (module: KitModuleNode) => void;
  onMove?: (module: KitModuleNode, direction: "up" | "down") => void;
};

function ModuleNode({ module, ...props }: { module: KitModuleNode } & Omit<Props, "tree">) {
  const [open, setOpen] = useState(true);
  return <li className="border-l border-slate-200 pl-4">
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 text-left"><span className="text-xs text-slate-400">{open ? "-" : "+"}</span><span className="font-semibold text-slate-950">{module.title}</span><span className="text-xs text-slate-400">{module.kits.length} kits</span></button>
      {props.admin ? <div className="flex gap-2 text-xs"><button type="button" onClick={() => props.onAdd?.(module.id)} className="text-slate-600">+ nested</button><button type="button" onClick={() => props.onEdit?.(module)} className="text-slate-600">Edit</button><button type="button" onClick={() => props.onMove?.(module, "up")} className="text-slate-600">Up</button><button type="button" onClick={() => props.onMove?.(module, "down")} className="text-slate-600">Down</button><button type="button" onClick={() => props.onDelete?.(module)} className="text-red-600">Delete</button></div> : null}
    </div>
    {open ? <div className="space-y-3 pb-4">{module.imageUrl ? <div className="relative aspect-3/1 overflow-hidden rounded-xl bg-slate-100"><Image src={module.imageUrl} alt={module.title} fill sizes="600px" className="object-cover" /></div> : null}{module.description ? <p className="text-sm leading-6 text-slate-500">{module.description}</p> : null}{module.children.map((child) => <ModuleNode key={child.id} module={child} {...props} />)}{module.kits.map((kit) => <Link key={kit.id} href={`/dashboard/kits/${kit.id}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-400"><div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">{kit.imageUrl ? <Image src={kit.imageUrl} alt={kit.title} fill sizes="80px" className="object-cover" /> : null}</div><div className="min-w-0"><p className="truncate font-medium text-slate-950">{kit.title}</p><p className="mt-1 text-xs text-slate-500">{kit.category} · {kit.stock} available</p></div></Link>)}</div> : null}
  </li>;
}

export default function KitModuleTree({ tree, ungroupedKits = [], admin, showAll = false, onAdd, onEdit, onDelete, onMove }: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const matches = (module: KitModuleNode): boolean => `${module.title} ${module.kits.map((kit) => kit.title).join(" ")}`.toLowerCase().includes(query.toLowerCase()) || module.children.some(matches);
  const visible = query ? tree.filter(matches) : tree;
  const selected = selectedId ? findModule(tree, selectedId) : null;

  // Close expanded view when clicking outside the grid container
  useEffect(() => {
    if (!expanded) return;
    function handleClickOutside(event: MouseEvent) {
      if (gridRef.current && !gridRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  // Also close on Escape key
  useEffect(() => {
    if (!expanded) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  if (admin) {
    return <div><div className="mb-5 flex flex-col gap-3 sm:flex-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search modules or kits" className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />{admin ? <button type="button" onClick={() => onAdd?.(null)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">+ Add module</button> : null}</div>{visible.length ? <ul className="space-y-4">{visible.map((module) => <ModuleNode key={module.id} module={module} admin={admin} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />)}</ul> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">No matching kits.</div>}</div>;
  }

  const allCards = selected
    ? [...selected.children, ...selected.kits.map((kit) => kitAsModule(kit, selected.id))]
    : [...visible, ...ungroupedKits.map((kit) => kitAsModule(kit, ""))];

  const filteredCards = allCards.filter((module) => !query || matches(module));
  const hasMore = !showAll && !query && !selected && filteredCards.length > COLLAPSED_COUNT;
  const visibleCards = hasMore && !expanded ? filteredCards.slice(0, COLLAPSED_COUNT) : filteredCards;
  const hiddenCount = filteredCards.length - COLLAPSED_COUNT;

  return (
    <div>
      {/* Search + back button row */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setSelectedId(null); setExpanded(false); }}
          placeholder="Search kits or sub-kits"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
        />
        {selected ? (
          <button type="button" onClick={() => setSelectedId(selected.parentId)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back to kits
          </button>
        ) : null}
      </div>

      {/* Selected module breadcrumb */}
      {selected ? (
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Inside kit</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">{selected.title}</h3>
          {selected.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{selected.description}</p> : null}
        </div>
      ) : null}

      {/* Overlay backdrop — shown when expanded, click it to close */}
      {expanded ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-10 bg-slate-900/20 backdrop-blur-[2px]"
          onClick={() => setExpanded(false)}
        />
      ) : null}

      {/* Kit cards grid */}
      {filteredCards.length ? (
        <div
          ref={gridRef}
          className={expanded ? "relative z-20 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200 sm:p-6" : ""}
        >
          {/* Close button shown inside the expanded panel */}
          {expanded ? (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-950">
                All kits <span className="ml-1 text-slate-400">({filteredCards.length})</span>
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Close kits panel"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map((module) => (
              <UserKitCard key={module.id} module={module} onExplore={setSelectedId} />
            ))}
          </div>

          {/* Show all / Show less toggle */}
          {hasMore ? (
            <div className="mt-6 text-center">
              {expanded ? (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" />
                  </svg>
                  Show less
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
                >
                  Show all {filteredCards.length} kits
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          ) : null}

          {/* "Show less" button at very bottom of expanded panel for long scroll */}
          {expanded && filteredCards.length > 6 ? (
            <div className="mt-8 border-t border-slate-100 pt-5 text-center">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-800"
              >
                Collapse kits
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          No matching kits.
        </div>
      )}
    </div>
  );
}

function findModule(tree: KitModuleNode[], id: string): KitModuleNode | null {
  for (const module of tree) {
    if (module.id === id) return module;
    const found = findModule(module.children, id);
    if (found) return found;
  }
  return null;
}

function kitAsModule(kit: KitModuleNode["kits"][number], parentId: string): KitModuleNode {
  return { id: kit.id, title: kit.title, description: kit.details, imageUrl: kit.imageUrl, parentId, sortOrder: kit.sortOrder, children: [], kits: [kit] };
}

function UserKitCard({ module, onExplore }: { module: KitModuleNode; onExplore: (id: string) => void }) {
  const firstKit = module.kits[0];
  const kit = module.kits.length === 1 && firstKit?.id === module.id ? firstKit : null;
  return <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
    <div className="relative aspect-video w-full overflow-hidden bg-slate-100">{module.imageUrl ? <Image src={module.imageUrl} alt={module.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>}</div>
    <div className="flex flex-1 flex-col p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{kit ? kit.category : module.children.length ? "Kit" : "Sub-kit"}</p><h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{module.title}</h3>{module.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{module.description}</p> : null}<div className="mt-auto flex flex-wrap gap-2 pt-5">{kit ? <Link href={`/dashboard/kits/${kit.id}`} className="text-sm font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4">View kit details</Link> : null}{module.children.length ? <button type="button" onClick={() => onExplore(module.id)} className="rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800">Explore sub-kits</button> : null}</div></div>
  </article>;
}
