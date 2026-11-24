import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Mic, Square } from "lucide-react";

export function VoiceRecordingButton({ onRecorded, disabled = false }: { onRecorded: (file: File) => void; disabled?: boolean }): ReactElement {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timeout = useRef<number | null>(null);

  async function toggle() {
    setError("");
    if (recording) { recorder.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Audio recording is not supported in this browser."); return; }
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = input;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
      const instance = mimeType ? new MediaRecorder(input, { mimeType }) : new MediaRecorder(input);
      chunks.current = [];
      instance.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      instance.onerror = () => { setError("The recording stopped unexpectedly. Try again."); setRecording(false); input.getTracks().forEach((track) => track.stop()); };
      instance.onstop = () => {
        const type = instance.mimeType || "audio/webm";
        const blob = new Blob(chunks.current, { type });
        input.getTracks().forEach((track) => track.stop());
        stream.current = null; recorder.current = null; setRecording(false);
        if (!blob.size) { setError("No audio was captured. Please try again."); return; }
        const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        onRecorded(new File([blob], `voice-message.${extension}`, { type: type.split(";")[0] }));
      };
      instance.start(); recorder.current = instance; setRecording(true);
      timeout.current = window.setTimeout(() => { if (instance.state === "recording") instance.stop(); }, 120_000);
    } catch { setError("Allow microphone access to record a voice message."); }
  }

  useEffect(() => () => { if (timeout.current !== null) window.clearTimeout(timeout.current); recorder.current?.stop(); stream.current?.getTracks().forEach((track) => track.stop()); }, []);
  return <span className="inline-flex flex-col items-start">
    <button type="button" onClick={() => void toggle()} disabled={disabled} aria-label={recording ? "Stop voice recording" : "Record a voice message"} title={recording ? "Stop recording" : "Record voice message"} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors disabled:opacity-50 ${recording ? "animate-pulse border-danger/30 bg-danger text-white" : "border-line bg-surface text-ink hover:border-danger/40 hover:bg-danger/5"}`}>
      {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4 text-danger" />}
      <span>{recording ? "Stop recording" : "Record audio"}</span>
    </button>
    {error ? <span role="status" className="max-w-44 text-center text-[10px] text-danger">{error}</span> : null}
  </span>;
}
