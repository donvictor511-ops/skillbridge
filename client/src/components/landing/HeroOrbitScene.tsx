import type { ReactElement } from "react";
import { BriefcaseBusiness, FolderKanban, Sparkles } from "lucide-react";

const orbitItems = [
  { label: "Portfolio", icon: FolderKanban, color: "text-brand", tint: "bg-brand/10" },
  { label: "Opportunities", icon: BriefcaseBusiness, color: "text-[#c17a12]", tint: "bg-[#fff4d8]" },
  { label: "AI Career Studio", icon: Sparkles, color: "text-[#7351c6]", tint: "bg-[#f0eaff]" },
];

export function HeroOrbitScene(): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="hero-scene relative mx-auto aspect-[1.08] w-full max-w-[650px] overflow-hidden rounded-[2rem] border border-white/70 bg-linear-to-br from-[#edf5ff] via-[#f5f8ff] to-[#e7f8f4] shadow-[0_28px_80px_-38px_rgba(20,33,61,0.45)]"
    >
      <div className="hero-scene-grid absolute inset-0 opacity-50" />
      <div className="absolute left-[17%] top-[11%] h-48 w-48 rounded-full bg-[#bdd8ff]/50 blur-3xl" />
      <div className="absolute bottom-[4%] right-[9%] h-52 w-52 rounded-full bg-[#bcece0]/60 blur-3xl" />

      <div className="hero-person-frame absolute inset-x-[8%] bottom-0 top-[2%] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1758273237776-28868e82eb36?auto=format&fit=crop&crop=faces&fm=jpg&q=82&w=1200"
          alt="A professional woman smiling as she checks her phone outdoors"
          className="h-full w-full object-cover object-[center_24%]"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full" viewBox="0 0 620 560" fill="none">
        <ellipse
          cx="310"
          cy="309"
          rx="264"
          ry="119"
          transform="rotate(-11 310 309)"
          stroke="#2563EB"
          strokeWidth="2.5"
          strokeDasharray="11 12"
        />
      </svg>

      {orbitItems.map(({ label, icon: Icon, color, tint }, index) => (
        <div
          key={label}
          className={`hero-orbit-icon hero-orbit-icon--${index + 1}`}
          title={label}
        >
          <span className={`flex h-12 w-12 items-center justify-center rounded-full border border-white bg-white shadow-[0_8px_28px_-10px_rgba(15,23,42,0.45)] sm:h-14 sm:w-14 ${color}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tint}`}>
              <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={1.8} />
            </span>
          </span>
        </div>
      ))}

      <div className="hero-photo-credit absolute bottom-2 right-3 z-[3] rounded-full bg-white/75 px-2 py-1 text-[9px] text-muted backdrop-blur">
        Photo by <a href="https://unsplash.com/photos/young-woman-with-coffee-and-phone-walks-outside-_EfMViVM4pM" target="_blank" rel="noreferrer" className="underline underline-offset-2">Vitaly Gariev</a> / Unsplash
      </div>
    </div>
  );
}
