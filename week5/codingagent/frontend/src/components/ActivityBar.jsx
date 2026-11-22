import React from "react";
import {
  Files,
  Search,
  Sparkles,
  Settings,
  Terminal,
  Bug,
} from "lucide-react";

export default function ActivityBar({
  activeView,
  onSelectView,
  agentStatus,
  onOpenCommandPalette,
}) {
  const isAgentThinking = agentStatus === "thinking";
  const isAgentWaiting = agentStatus === "waiting_for_review";

  return (
    <aside className="w-12 bg-[#333333] flex flex-col justify-between items-center py-2 select-none z-20 border-r border-[#252526] flex-shrink-0">
      {/* Top action icons */}
      <div className="flex flex-col items-center w-full space-y-1">
        <button
          title="Explorer (Ctrl+Shift+E)"
          onClick={() => onSelectView("explorer")}
          className={`relative w-full h-11 flex items-center justify-center transition-colors ${
            activeView === "explorer"
              ? "text-white border-l-2 border-[#007acc] bg-[#252526]"
              : "text-[#858585] hover:text-[#d4d4d4]"
          }`}
        >
          <Files size={22} strokeWidth={1.75} />
        </button>

        <button
          title="Search in Files (Ctrl+Shift+F)"
          onClick={() => onSelectView("search")}
          className={`relative w-full h-11 flex items-center justify-center transition-colors ${
            activeView === "search"
              ? "text-white border-l-2 border-[#007acc] bg-[#252526]"
              : "text-[#858585] hover:text-[#d4d4d4]"
          }`}
        >
          <Search size={22} strokeWidth={1.75} />
        </button>

        <button
          title="AI Bug-Fixing Agent"
          onClick={() => onSelectView("agent")}
          className={`relative w-full h-11 flex items-center justify-center transition-colors ${
            activeView === "agent"
              ? "text-white border-l-2 border-[#007acc] bg-[#252526]"
              : "text-[#858585] hover:text-[#d4d4d4]"
          }`}
        >
          <Sparkles size={22} strokeWidth={1.75} className="text-[#38bdf8]" />

          {/* Status badge */}
          {isAgentThinking && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
            </span>
          )}

          {isAgentWaiting && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Bottom utility icons */}
      <div className="flex flex-col items-center w-full space-y-1">
        <button
          title="Command Palette (Ctrl+Shift+P)"
          onClick={onOpenCommandPalette}
          className="w-full h-10 flex items-center justify-center text-[#858585] hover:text-[#d4d4d4] transition-colors"
        >
          <Terminal size={19} strokeWidth={1.75} />
        </button>

        <button
          title="Settings"
          className="w-full h-10 flex items-center justify-center text-[#858585] hover:text-[#d4d4d4] transition-colors"
        >
          <Settings size={19} strokeWidth={1.75} />
        </button>
      </div>
    </aside>
  );
}
