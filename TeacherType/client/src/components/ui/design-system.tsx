import React from "react";

// Reusable card for sections
export function SectionCard({ title, icon, children, aside }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border bg-white/90 shadow-sm p-6 md:p-8 mb-6">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
          <span className="text-emerald-600">{icon}</span>{title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

// Primary button with strong visual hierarchy
export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full md:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700
                 text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

// Secondary button for less prominent actions
export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full md:w-auto px-6 py-3 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50
                 text-gray-900 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200
                 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

// Language selection pills with clear active state
export function LangPill({ active, label, onClick }: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-2xl border text-sm md:text-base transition
                  ${active
                    ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                    : "bg-white border-gray-300 hover:bg-gray-50"}`}
    >
      {label}
    </button>
  );
}

// Microphone button with clear state feedback
export function MicButton({ state, onClick }: {
  state: "idle" | "listening" | "translating";
  onClick: () => void;
}) {
  const label =
    state === "listening" ? "Listening…" :
    state === "translating" ? "Translating…" : "Record & Auto-Translate";

  return (
    <button
      onClick={onClick}
      disabled={state === "translating"}
      className={`w-full md:w-auto px-6 py-4 rounded-2xl font-medium shadow-sm focus:outline-none focus:ring-2
                  ${state === "listening"
                    ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-300"
                    : state === "translating" 
                    ? "bg-yellow-500 text-white cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300"}`}
    >
      {state === "listening" ? "🎙️ " : state === "translating" ? "⏳ " : "🎤 "}{label}
    </button>
  );
}

// Detected language display with flag and confidence
export function DetectedLanguage({ code, name, confidence }: {
  code?: string;
  name?: string;
  confidence?: number;
}) {
  if (!code || !name) {
    return (
      <div className="text-gray-500 text-sm italic py-3">
        Language will appear here after recording…
      </div>
    );
  }
  
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 text-emerald-800
                    border border-emerald-200 px-4 py-3">
      <span className="text-lg">🌍</span>
      <span className="font-medium text-base md:text-lg">{name}</span>
      {confidence != null && (
        <span className="text-xs opacity-80">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </div>
  );
}

// Translation result pane with fade support
export function TranslationPane({ english, fadingOut }: {
  english?: string;
  fadingOut?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 bg-blue-50/60 transition-opacity duration-300
                     ${fadingOut ? "opacity-30" : "opacity-100"}`}>
      <div className="text-sm text-gray-600 mb-1">English Translation</div>
      <div className="text-lg md:text-xl font-medium text-blue-900">
        {english || "Translation will appear here…"}
      </div>
    </div>
  );
}

// Page shell with gradient background and proper spacing
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {children}
      </div>
    </div>
  );
}

// Large, calm textarea styling
export function LargeTextarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white p-4 md:p-5 min-h-[120px]
                  focus:outline-none focus:ring-2 focus:ring-emerald-200 text-base md:text-lg
                  placeholder:text-gray-500 resize-none ${className}`}
    />
  );
}

// Large, calm input styling
export function LargeInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white p-4 md:p-5
                  focus:outline-none focus:ring-2 focus:ring-emerald-200 text-base md:text-lg
                  placeholder:text-gray-500 ${className}`}
    />
  );
}