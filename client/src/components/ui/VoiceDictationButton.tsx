import { useRef, useState } from "react";
import type { ReactElement } from "react";
import { Mic, MicOff } from "lucide-react";

interface SpeechResult { transcript: string }
interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<ArrayLike<SpeechResult>> }
interface SpeechRecognitionLike { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: SpeechRecognitionEventLike) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start(): void; stop(): void; }
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

export function VoiceDictationButton({ onText, label = "Dictate with voice", disabled = false }: { onText: (text: string) => void; label?: string; disabled?: boolean }): ReactElement {
  const [listening, setListening] = useState(false); const recognition = useRef<SpeechRecognitionLike | null>(null);
  function toggle() {
    if (listening) { recognition.current?.stop(); setListening(false); return; }
    const host = window as SpeechWindow; const Speech = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!Speech) { window.alert("Voice typing is not supported by this browser. Try Chrome or Edge."); return; }
    const engine = new Speech(); engine.lang = navigator.language || "en-US"; engine.continuous = true; engine.interimResults = false;
    engine.onresult = (event) => { const words: string[] = []; for (let i = event.resultIndex; i < event.results.length; i += 1) words.push(event.results[i]?.[0]?.transcript ?? ""); if (words.length) onText(words.join(" ")); };
    engine.onerror = () => setListening(false); engine.onend = () => setListening(false); recognition.current = engine; setListening(true); engine.start();
  }
  return <button type="button" onClick={toggle} disabled={disabled} aria-label={listening ? "Stop voice typing" : label} title={listening ? "Stop voice typing" : label} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${listening ? "bg-danger/10 text-danger" : "text-muted hover:bg-page hover:text-brand"}`}>{listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>;
}
