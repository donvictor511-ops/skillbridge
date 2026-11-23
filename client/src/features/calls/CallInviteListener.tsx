import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCurrentUser } from "../auth/authQueries";
import { apiBaseURL } from "../../services/apiClient";
import { leaveCall } from "./callsService";
import { paths } from "../../app/paths";

interface IncomingCall { callId: string; mode: "audio" | "video"; kind: string; communityName?: string | null; caller: { displayName: string } }
export function CallInviteListener(): ReactElement | null {
  const { data: user } = useCurrentUser(); const navigate = useNavigate(); const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  useEffect(() => {
    if (!user?.onboardedAt) return;
    const source = new EventSource(`${apiBaseURL}/messages/events`, { withCredentials: true });
    source.addEventListener("call.invite", (raw) => { try { const data = JSON.parse((raw as MessageEvent<string>).data) as IncomingCall; setIncoming(data); } catch { /* Ignore malformed events. */ } });
    source.addEventListener("call.ended", (raw) => { const data = JSON.parse((raw as MessageEvent<string>).data) as { callId: string }; setIncoming((current) => current?.callId === data.callId ? null : current); });
    return () => source.close();
  }, [user?.id, user?.onboardedAt]);
  if (!incoming) return null;
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="incoming-call-title" className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-2xl"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">{incoming.mode === "video" ? <Video /> : <Phone />}</div><h2 id="incoming-call-title" className="mt-4 text-lg font-bold text-navy">Incoming {incoming.mode} call</h2><p className="mt-1 text-sm text-muted">{incoming.caller?.displayName ?? "A SkillBridge member"}{incoming.communityName ? ` · ${incoming.communityName}` : ""}</p><div className="mt-5 flex justify-center gap-3"><button type="button" onClick={() => { void leaveCall(incoming.callId, true); setIncoming(null); }} className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink"><PhoneOff className="h-4 w-4" />Decline</button><button type="button" onClick={() => { const id = incoming.callId; setIncoming(null); navigate(`${paths.calls}/${id}`); }} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white">{incoming.mode === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}Accept</button></div></section></div>;
}
