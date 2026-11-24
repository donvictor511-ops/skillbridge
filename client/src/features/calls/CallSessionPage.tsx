import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { isAxiosError } from "axios";
import { useNavigate, useParams } from "react-router";
import { Camera, CameraOff, ImagePlus, MessageSquare, Mic, MicOff, MonitorDown, MonitorUp, PhoneOff, Send, X } from "lucide-react";
import { useCurrentUser } from "../auth/authQueries";
import { Avatar, Card, Spinner } from "../../components/ui";
import { apiBaseURL } from "../../services/apiClient";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { getCall, joinCall, leaveCall, listCallMessages, sendCallMessage, sendSignal } from "./callsService";
import type { CallMessage, CallMode, CallRoom } from "./callsService";
import { uploadPostMedia } from "../posts/postsService";
import { VoiceDictationButton } from "../../components/ui/VoiceDictationButton";
import { VoiceRecordingButton } from "../../components/ui/VoiceRecordingButton";
import { uploadCallVoice } from "./callsService";

type Signal = { type?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
const buttonClass = "inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20";
function callErrorMessage(problem: unknown): string {
  if (isAxiosError<{ error?: { message?: string } }>(problem)) return problem.response?.data?.error?.message ?? `Call request failed (${problem.response?.status ?? "network error"}). Check your connection and try again.`;
  return problem instanceof Error ? problem.message : "Could not join the call. Allow camera and microphone access, then try again.";
}

export function CallSessionPage(): ReactElement {
  const { callId = "" } = useParams(); const navigate = useNavigate(); const { data: user } = useCurrentUser();
  const [room, setRoom] = useState<CallRoom | null>(null); const [error, setError] = useState(""); const [muted, setMuted] = useState(false); const [cameraOff, setCameraOff] = useState(false); const [connecting, setConnecting] = useState(true);
  const [remotes, setRemotes] = useState<Record<string, MediaStream>>({});
  const [callMessages, setCallMessages] = useState<CallMessage[]>([]); const [chatOpen, setChatOpen] = useState(false); const [chatDraft, setChatDraft] = useState(""); const [chatFile, setChatFile] = useState<File | null>(null); const [chatVoice, setChatVoice] = useState<File | null>(null); const [sharingScreen, setSharingScreen] = useState(false); const [chatError, setChatError] = useState("");
  const localVideo = useRef<HTMLVideoElement>(null); const screenVideo = useRef<HTMLVideoElement>(null); const localStream = useRef<MediaStream | null>(null); const peers = useRef(new Map<string, RTCPeerConnection>()); const makingOffer = useRef(new Set<string>()); const left = useRef(false);
  const screenStream = useRef<MediaStream | null>(null); const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>()); const messageList = useRef<HTMLDivElement>(null); const leaveTimer = useRef<number | null>(null);
  useDocumentTitle("Call | SkillBridge");
  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = localStream.current;
    if (screenVideo.current) screenVideo.current.srcObject = screenStream.current;
  }, [connecting, sharingScreen, cameraOff]);
  const makePeer = useCallback((peerId: string, current: CallRoom) => {
    const existing = peers.current.get(peerId); if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: current.iceServers?.length ? current.iceServers : [{ urls: "stun:stun.l.google.com:19302" }] });
    localStream.current?.getTracks().forEach((track) => pc.addTrack(track.kind === "video" && screenStream.current?.getVideoTracks()[0] ? screenStream.current.getVideoTracks()[0] : track, localStream.current!));
    pc.ontrack = (event) => {
      const incoming = event.streams[0] ?? new MediaStream([event.track]);
      setRemotes((value) => {
        const existingStream = value[peerId];
        if (!existingStream) return { ...value, [peerId]: incoming };
        if (!existingStream.getTracks().some((track) => track.id === event.track.id)) existingStream.addTrack(event.track);
        return { ...value, [peerId]: existingStream };
      });
    };
    pc.onicecandidate = (event) => { if (event.candidate) void sendSignal(current.id, peerId, { type: "ice", candidate: event.candidate.toJSON() }).catch(() => {}); };
    peers.current.set(peerId, pc); return pc;
  }, []);
  const offerPeer = useCallback(async (peerId: string, current: CallRoom) => {
    const pc = makePeer(peerId, current); if (makingOffer.current.has(peerId) || pc.signalingState !== "stable") return;
    makingOffer.current.add(peerId);
    try { const offer = await pc.createOffer(); await pc.setLocalDescription(offer); await sendSignal(current.id, peerId, { type: "offer", sdp: pc.localDescription }); }
    catch { setError("Could not connect the call. Check your network and try again."); }
    finally { makingOffer.current.delete(peerId); }
  }, [makePeer]);
  useEffect(() => {
    const currentUserId = user?.id;
    if (!callId || !currentUserId) return; let closed = false; let events: EventSource | null = null; let peerRefresh: number | undefined;
    if (leaveTimer.current !== null) { window.clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    left.current = false;
    const signedInUserId = currentUserId;
    const peerConnections = peers.current;
    async function begin() {
      try {
        let current = await getCall(callId); if (closed) return; if (current.status !== "active") throw new Error("This call has ended.");
        current = await joinCall(callId); if (closed) return;
        setRoom(current);
        setCallMessages(await listCallMessages(callId));
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: current.mode === "video" });
        if (closed) { localStream.current.getTracks().forEach((track) => track.stop()); return; }
        if (localVideo.current) localVideo.current.srcObject = localStream.current;
        events = new EventSource(`${apiBaseURL}/messages/events`, { withCredentials: true });
        async function applyPendingIce(peerId: string, pc: RTCPeerConnection) {
          const queued = pendingIce.current.get(peerId) ?? [];
          pendingIce.current.delete(peerId);
          for (const candidate of queued) await pc.addIceCandidate(candidate);
        }
        events.addEventListener("call.signal", (raw) => { void (async () => {
          const msg = JSON.parse((raw as MessageEvent<string>).data) as { callId: string; fromUserId: string; signal: Signal }; if (msg.callId !== callId || !msg.fromUserId) return;
          const pc = makePeer(msg.fromUserId, current);
          if (msg.signal.type === "offer" && msg.signal.sdp) { await pc.setRemoteDescription(msg.signal.sdp); await applyPendingIce(msg.fromUserId, pc); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); await sendSignal(callId, msg.fromUserId, { type: "answer", sdp: pc.localDescription }); }
          else if (msg.signal.type === "answer" && msg.signal.sdp) { await pc.setRemoteDescription(msg.signal.sdp); await applyPendingIce(msg.fromUserId, pc); }
          else if (msg.signal.type === "ice" && msg.signal.candidate) {
            if (pc.remoteDescription) await pc.addIceCandidate(msg.signal.candidate);
            else pendingIce.current.set(msg.fromUserId, [...(pendingIce.current.get(msg.fromUserId) ?? []), msg.signal.candidate]);
          }
        })().catch(() => setError("A participant connection was interrupted.")); });
        events.addEventListener("call.peer_joined", (raw) => { const msg = JSON.parse((raw as MessageEvent<string>).data) as { callId: string; userId: string; left?: boolean }; if (msg.callId !== callId || !msg.userId) return; if (msg.left) { peers.current.get(msg.userId)?.close(); peers.current.delete(msg.userId); setRemotes((value) => { const next = { ...value }; delete next[msg.userId]; return next; }); return; } const peer = current.participants.find((p) => p.userId === msg.userId); if (peer) peer.status = "joined"; if (signedInUserId.localeCompare(msg.userId) < 0) void offerPeer(msg.userId, current); });
        events.addEventListener("call.ended", (raw) => { const msg = JSON.parse((raw as MessageEvent<string>).data) as { callId: string }; if (msg.callId === callId) setError("The call has ended."); });
        events.addEventListener("call.message", (raw) => { const msg = JSON.parse((raw as MessageEvent<string>).data) as { callId: string; message: CallMessage }; if (msg.callId === callId) setCallMessages((items) => items.some((item) => item.id === msg.message.id) ? items : [...items, msg.message]); });
        for (const peer of current.participants.filter((item) => item.status === "joined" && item.userId !== signedInUserId)) if (signedInUserId.localeCompare(peer.userId) < 0) await offerPeer(peer.userId, current);
        peerRefresh = window.setInterval(() => { void getCall(callId).then((latest) => { if (closed) return; setRoom(latest); if (latest.status !== "active") { setError("The call has ended."); return; } for (const peer of latest.participants.filter((item) => item.status === "joined" && item.userId !== signedInUserId)) if (signedInUserId.localeCompare(peer.userId) < 0) void offerPeer(peer.userId, latest); }).catch(() => {}); }, 3000);
        setConnecting(false);
      } catch (problem) { if (!closed) { setError(callErrorMessage(problem)); setConnecting(false); } }
    }
    void begin();
    return () => { closed = true; if (peerRefresh) window.clearInterval(peerRefresh); events?.close(); peerConnections.forEach((pc) => pc.close()); peerConnections.clear(); screenStream.current?.getTracks().forEach((track) => track.stop()); screenStream.current = null; localStream.current?.getTracks().forEach((track) => track.stop()); localStream.current = null; if (!left.current) { left.current = true; leaveTimer.current = window.setTimeout(() => { leaveTimer.current = null; void leaveCall(callId).catch(() => {}); }, 250); } };
  }, [callId, user?.id, makePeer, offerPeer]);
  async function exit() { if (!left.current) { left.current = true; await leaveCall(callId).catch(() => {}); } navigate(-1); }
  function toggleMic() { const next = !muted; setMuted(next); localStream.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); }
  function toggleCamera() { const next = !cameraOff; setCameraOff(next); localStream.current?.getVideoTracks().forEach((track) => { track.enabled = !next; }); }
  async function toggleScreenShare() {
    if (screenStream.current) { const old = screenStream.current; screenStream.current = null; old.getTracks().forEach((track) => { track.onended = null; track.stop(); }); const camera = localStream.current?.getVideoTracks()[0] ?? null; for (const pc of peers.current.values()) { const sender = pc.getSenders().find((item) => item.track?.kind === "video"); if (sender) await sender.replaceTrack(camera); } setSharingScreen(false); return; }
    try { const display = await navigator.mediaDevices.getDisplayMedia({ video: true }); screenStream.current = display; const track = display.getVideoTracks()[0]; if (!track) throw new Error("No screen track was available."); for (const pc of peers.current.values()) { const sender = pc.getSenders().find((item) => item.track?.kind === "video"); if (sender) await sender.replaceTrack(track); } setSharingScreen(true); track.onended = () => { screenStream.current = null; const camera = localStream.current?.getVideoTracks()[0] ?? null; for (const pc of peers.current.values()) { const sender = pc.getSenders().find((item) => item.track?.kind === "video"); if (sender) void sender.replaceTrack(camera); } setSharingScreen(false); }; } catch { setError("Screen sharing could not start. Check your browser permissions and try again."); }
  }
  async function postChat(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!callId || (!chatDraft.trim() && !chatFile && !chatVoice)) return; try { const media = chatFile ? await uploadPostMedia(chatFile) : chatVoice ? await uploadCallVoice(chatVoice) : null; const sent = await sendCallMessage(callId, { content: chatDraft.trim(), ...(media ?? {}) }); setCallMessages((items) => items.some((item) => item.id === sent.id) ? items : [...items, sent]); setChatDraft(""); setChatFile(null); setChatVoice(null); setChatError(""); } catch { setChatError("Could not send this message. Please try again."); } }
  useEffect(() => { if (messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight; }, [callMessages, chatOpen]);
  const remoteParticipants = room?.participants.filter((participant) => participant.userId !== user?.id && participant.status === "joined") ?? [];
  if (connecting) return <main className="grid min-h-[70vh] place-items-center bg-navy text-white"><div className="text-center"><Spinner size="lg" label="Connecting call" /><p className="mt-4">Joining call…</p></div></main>;
  return <main className="min-h-[calc(100dvh-3.75rem)] bg-[#101820] p-4 text-white sm:p-8"><div className="mx-auto flex max-w-6xl flex-col gap-5"><header className="flex items-center justify-between"><div><h1 className="text-xl font-semibold">{room?.kind === "community" ? room.community?.name : room?.interview?.jobTitle ?? "Voice and video call"}</h1><p className="text-sm text-white/60">{room?.mode === "audio" ? "Audio call" : "Video call"} · {Object.keys(remotes).length + 1} connected</p></div><div className="flex gap-2"><button type="button" onClick={() => setChatOpen((value) => !value)} className={buttonClass} aria-label={chatOpen ? "Close call chat" : "Open call chat"}><MessageSquare /></button><button type="button" onClick={exit} className="rounded-lg bg-red-600 px-4 py-2 font-semibold">Leave</button></div></header>
    {error ? <p role="alert" className="rounded-xl bg-red-900/50 p-4">{error}</p> : null}
    <div className={`grid gap-4 ${chatOpen ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : ""}`}>
      <section className="relative min-h-[55vh] h-[calc(100dvh-15rem)] overflow-hidden rounded-2xl bg-black">
        {room?.mode === "video" ? <>
          {sharingScreen ? <video ref={screenVideo} autoPlay muted playsInline className="h-full w-full object-contain" aria-label="Your shared screen" /> : remoteParticipants[0] ? <RemoteTile featured key={remoteParticipants[0].userId} name={remoteParticipants[0].displayName} avatar={remoteParticipants[0].avatarUrl} stream={remotes[remoteParticipants[0].userId]} mode="video" /> : <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 to-[#101820] text-center"><Avatar name="Waiting for the other person" size="lg" /><p className="text-sm text-white/70">Waiting for the other person to join…</p></div>}
          <div className="absolute bottom-4 right-4 z-10 h-28 w-40 overflow-hidden rounded-xl border-2 border-white/80 bg-slate-900 shadow-2xl sm:h-36 sm:w-52">
            {cameraOff ? <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-800"><Avatar name={user?.email ?? "You"} /><span className="text-xs text-white/80">Camera off</span></div> : <video ref={localVideo} autoPlay muted playsInline className="h-full w-full object-cover" aria-label="Your camera preview" />}
            <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white">You</span>
          </div>
          {!sharingScreen ? remoteParticipants.slice(1).length ? <div className="absolute left-4 top-4 z-10 flex max-w-[60%] gap-2 overflow-x-auto">{remoteParticipants.slice(1).map((participant) => <div key={participant.userId} className="w-36 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-slate-900/80"><RemoteTile name={participant.displayName} avatar={participant.avatarUrl} stream={remotes[participant.userId]} mode="video" /><p className="truncate px-2 py-1 text-xs">{participant.displayName}</p></div>)}</div> : null : <span className="absolute left-4 top-4 rounded-lg bg-black/60 px-3 py-2 text-sm">You’re sharing your screen</span>}
        </> : <div className="grid h-full content-center gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"><AudioTile name="You" /><>{remoteParticipants.map((participant) => <AudioTile key={participant.userId} name={participant.displayName} avatar={participant.avatarUrl} stream={remotes[participant.userId]} />)}</></div>}
      </section>
      {chatOpen ? <aside className="flex max-h-[65vh] flex-col rounded-2xl bg-white text-ink"><div className="flex items-center justify-between border-b border-line p-3"><h2 className="font-semibold">Call chat</h2><button type="button" onClick={() => setChatOpen(false)} aria-label="Close chat" className="rounded p-1 text-muted hover:bg-page"><X className="h-4 w-4" /></button></div><div ref={messageList} className="flex-1 space-y-3 overflow-y-auto p-3">{callMessages.map((message) => <div key={message.id} className={`max-w-[90%] rounded-xl p-2.5 text-sm ${message.senderId === user?.id ? "ml-auto bg-brand/10" : "bg-page"}`}><p className="mb-1 text-[11px] font-semibold text-muted">{message.senderId === user?.id ? "You" : message.senderName}</p>{message.content ? <p className="whitespace-pre-wrap break-words">{message.content}</p> : null}{message.mediaUrl ? message.mediaType === "video" ? <video controls playsInline src={message.mediaUrl} className="mt-2 max-h-44 max-w-full rounded-lg" /> : message.mediaType === "audio" ? <audio controls preload="metadata" src={message.mediaUrl} className="mt-2 max-w-full" /> : <img src={message.mediaUrl} alt="Shared in call" className="mt-2 max-h-44 max-w-full rounded-lg" /> : null}</div>)}</div><form onSubmit={(event) => void postChat(event)} className="space-y-2 border-t border-line p-3"><textarea value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} rows={2} maxLength={5000} placeholder="Message everyone…" className="w-full resize-none rounded-lg border border-line p-2 text-sm" /><div className="flex items-center justify-between"><div className="flex items-center"><label className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-muted hover:bg-page" aria-label="Attach image or video"><ImagePlus className="h-4 w-4" /><input type="file" accept="image/*,video/*" className="sr-only" onChange={(event) => { setChatFile(event.currentTarget.files?.[0] ?? null); setChatVoice(null); }} /></label><VoiceDictationButton onText={(text) => setChatDraft((value) => `${value}${value ? " " : ""}${text}`)} /><VoiceRecordingButton onRecorded={(file) => { setChatVoice(file); setChatFile(null); }} />{chatFile || chatVoice ? <span className="max-w-24 truncate text-xs text-muted">{chatFile?.name ?? chatVoice?.name}</span> : null}</div><button type="submit" disabled={!chatDraft.trim() && !chatFile && !chatVoice} className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white disabled:opacity-50" aria-label="Send message"><Send className="h-4 w-4" /></button></div>{chatError ? <p role="alert" className="text-xs text-danger">{chatError}</p> : null}</form></aside> : null}
    </div>
    <footer className="flex justify-center gap-4"><button type="button" aria-label={muted ? "Unmute microphone" : "Mute microphone"} onClick={toggleMic} className={buttonClass}>{muted ? <MicOff /> : <Mic />}</button>{room?.mode === "video" ? <><button type="button" aria-label={cameraOff ? "Turn camera on" : "Turn camera off"} onClick={toggleCamera} className={buttonClass}>{cameraOff ? <CameraOff /> : <Camera />}</button><button type="button" onClick={() => void toggleScreenShare()} aria-label={sharingScreen ? "Stop screen sharing" : "Share screen"} className={buttonClass}>{sharingScreen ? <MonitorDown /> : <MonitorUp />}</button></> : null}<button type="button" onClick={exit} aria-label="End call" className="inline-flex h-12 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"><PhoneOff /></button></footer></div></main>;
}
function RemoteTile({ name, avatar, stream, mode, featured = false }: { name: string; avatar: string | null; stream?: MediaStream; mode: CallMode; featured?: boolean }): ReactElement {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = stream ?? null;
    if (stream) void element.play().catch(() => {});
  }, [stream]);
  if (mode !== "video") return <AudioTile name={name} avatar={avatar} stream={stream} />;
  return <div className={featured ? "relative h-full w-full bg-slate-900" : "relative aspect-video w-full overflow-hidden bg-slate-900"}>
    {stream ? <video ref={video} autoPlay playsInline className="h-full w-full object-cover" aria-label={`${name}'s video`} /> : <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 to-[#101820] text-center"><Avatar name={name} src={avatar} size="lg" /><p className="text-sm text-white/70">Connecting to {name}…</p></div>}
    <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">{name}</span>
  </div>;
}
function AudioTile({ name, avatar, stream }: { name: string; avatar?: string | null; stream?: MediaStream }): ReactElement { const audio = useRef<HTMLAudioElement>(null); useEffect(() => { if (audio.current) audio.current.srcObject = stream ?? null; }, [stream]); return <Card className="flex aspect-video flex-col items-center justify-center gap-3 bg-white/10 text-white"><Avatar name={name} src={avatar} size="lg" /><span>{name}</span>{stream ? <audio ref={audio} autoPlay /> : null}</Card>; }
