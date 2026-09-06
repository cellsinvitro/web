"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { createLiveClassToken, fetchLiveClass, leaveLiveClass, type LiveClass } from "@/lib/api";

export default function LiveClassPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [liveClass, setLiveClass] = useState<LiveClass | null>(null);
  const [connection, setConnection] = useState<{ token: string; url: string; attendanceId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([fetchLiveClass(params.id), createLiveClassToken(params.id)])
      .then(([item, token]) => { setLiveClass(item); setConnection(token); })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to join this class"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const leave = async () => {
    if (connection) await leaveLiveClass(params.id, connection.attendanceId).catch(() => undefined);
    router.push("/dashboard/live-classes");
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-sm text-slate-300">Preparing your classroom...</div>;
  if (error || !liveClass || !connection) return <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-5"><div className="max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"><h1 className="font-semibold text-slate-950">Unable to join class</h1><p className="mt-2 text-sm text-slate-500">{error || "This class is not available right now."}</p><button type="button" onClick={() => router.push("/dashboard/live-classes")} className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Back to live classes</button></div></div>;

  return <div className="min-h-dvh bg-slate-950 text-white"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Live classroom</p><h1 className="mt-1 text-base font-semibold">{liveClass.title}</h1></div><div className="flex items-center gap-3"><span className="flex items-center gap-2 text-xs text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Connected</span><button type="button" onClick={leave} className="rounded-lg bg-red-500/90 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500">Leave class</button></div></header><main className="mx-auto grid max-w-[1600px] gap-4 p-3 sm:p-5"><section className="min-h-[70vh] overflow-hidden rounded-2xl border border-white/10 bg-slate-900"><LiveKitRoom token={connection.token} serverUrl={connection.url} connect audio video onDisconnected={() => { void leave(); }}><RoomAudioRenderer /><VideoConference /></LiveKitRoom></section><section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start"><div><h2 className="font-semibold">{liveClass.title}</h2><p className="mt-1 text-sm text-slate-400">Hosted by {liveClass.teacher.name || liveClass.teacher.email}{liveClass.description ? ` · ${liveClass.description}` : ""}</p></div><div className="flex gap-2 text-xs text-slate-400"><span className="rounded-full border border-white/10 px-3 py-1.5">Chat {liveClass.chatEnabled ? "enabled" : "disabled"}</span><span className="rounded-full border border-white/10 px-3 py-1.5">{liveClass.studentCameraEnabled ? "Camera enabled" : "Camera off"}</span></div></section></main></div>;
}
