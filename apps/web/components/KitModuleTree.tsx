"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { KitModuleNode } from "@/lib/api";

type Props = {
  tree: KitModuleNode[];
  ungroupedKits?: KitModuleNode["kits"];
  admin?: boolean;
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
    {open ? <div className="space-y-3 pb-4">{module.imageUrl ? <div className="relative aspect-3/1 overflow-hidden rounded-xl bg-slate-100"><Image src={module.imageUrl} alt={module.title} fill sizes="600px" className="object-cover" /></div> : null}{module.description ? <p className="text-sm leading-6 text-slate-500">{module.description}</p> : null}{module.children.map((child) => <ModuleNode key={child.id} module={child} {...props} />)}{module.kits.map((kit) => <Link key={kit.id} href={`/kits/${kit.id}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-400"><div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">{kit.imageUrl ? <Image src={kit.imageUrl} alt={kit.title} fill sizes="80px" className="object-cover" /> : null}</div><div className="min-w-0"><p className="truncate font-medium text-slate-950">{kit.title}</p><p className="mt-1 text-xs text-slate-500">{kit.category} · {kit.stock} available</p></div></Link>)}</div> : null}
  </li>;
}

export default function KitModuleTree({ tree, ungroupedKits = [], admin, onAdd, onEdit, onDelete, onMove }: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const matches = (module: KitModuleNode): boolean => `${module.title} ${module.kits.map((kit) => kit.title).join(" ")}`.toLowerCase().includes(query.toLowerCase()) || module.children.some(matches);
  const visible = query ? tree.filter(matches) : tree;
  const selected = selectedId ? findModule(tree, selectedId) : null;

  if (admin) {
    return <div><div className="mb-5 flex flex-col gap-3 sm:flex-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search modules or kits" className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />{admin ? <button type="button" onClick={() => onAdd?.(null)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">+ Add module</button> : null}</div>{visible.length ? <ul className="space-y-4">{visible.map((module) => <ModuleNode key={module.id} module={module} admin={admin} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />)}</ul> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">No matching kits.</div>}</div>;
  }

  const cards = selected ? [...selected.children, ...selected.kits.map((kit) => kitAsModule(kit, selected.id))] : [...visible, ...ungroupedKits.map((kit) => kitAsModule(kit, ""))];
  return <div>
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"><input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }} placeholder="Search kits or sub-kits" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400" />{selected ? <button type="button" onClick={() => setSelectedId(selected.parentId)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to kits</button> : null}</div>
    {selected ? <div className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Inside kit</p><h3 className="mt-1 text-2xl font-semibold text-slate-950">{selected.title}</h3>{selected.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{selected.description}</p> : null}</div> : null}
    {cards.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{cards.filter((module) => !query || matches(module)).map((module) => <UserKitCard key={module.id} module={module} onExplore={setSelectedId} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">No matching kits.</div>}
  </div>;
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
    <div className="flex flex-1 flex-col p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{kit ? kit.category : module.children.length ? "Kit" : "Sub-kit"}</p><h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{module.title}</h3>{module.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{module.description}</p> : null}<div className="mt-auto flex flex-wrap gap-2 pt-5">{kit ? <Link href={`/kits/${kit.id}`} className="text-sm font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4">View kit details</Link> : null}{module.children.length ? <button type="button" onClick={() => onExplore(module.id)} className="rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800">Explore sub-kits</button> : null}</div></div>
  </article>;
}