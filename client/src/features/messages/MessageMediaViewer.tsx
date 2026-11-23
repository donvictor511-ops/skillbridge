import { useEffect } from "react";
import type { ReactElement } from "react";
import { X } from "lucide-react";

export function MessageMediaViewer({ media, onClose }: { media: { url: string; type: "image" | "video" } | null; onClose: () => void }): ReactElement | null {
  useEffect(() => {
    if (!media) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [media, onClose]);
  if (!media) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label={media.type === "image" ? "Expanded photo" : "Expanded video"} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <button type="button" onClick={onClose} aria-label="Close media viewer" className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><X className="h-5 w-5" /></button>
    {media.type === "image" ? <img src={media.url} alt="Expanded photo attachment" className="max-h-[90vh] max-w-[95vw] object-contain" /> : <video src={media.url} controls autoPlay playsInline className="max-h-[90vh] max-w-[95vw] rounded-lg bg-black" />}
  </div>;
}
