import React from "react";
import {
  FolderGit2,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function StatusBar({
  workspaceName = "workspace",
  activeFile,
  cursorPosition = { line: 1, column: 1 },
  language = "Plain Text",
  agentStatus = "idle",
  appliedPatch,
  onUndo,
}) {
  const getAgentStatusDisplay = () => {
    if (agentStatus === "thinking") {
      return (
        <span className="flex items-center space-x-1.5 text-sky-300 bg-sky-950/70 px-2 py-0.5 rounded">
          <Loader2 size={12} className="animate-spin text-sky-400" />
          <span>Agent: Thinking...</span>
        </span>
      );
    }
    if (agentStatus === "waiting_for_review") {
      return (
        <span className="flex items-center space-x-1.5 text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded font-medium animate-pulse">
          <AlertTriangle size={12} className="text-amber-400" />
          <span>Agent: Review Pending</span>
        </span>
      );
    }
    if (agentStatus === "error") {
      return (
        <span className="flex items-center space-x-1.5 text-rose-300 bg-rose-950/70 px-2 py-0.5 rounded">
          <span>Agent: Error</span>
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1.5 text-[#9cdcfe]">
        <Sparkles size={12} className="text-emerald-400" />
        <span>Agent: Idle</span>
      </span>
    );
  };

  return (
    <footer className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[12px] font-sans select-none z-20 flex-shrink-0">
      {/* Left side info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
          <FolderGit2 size={13} />
          <span className="font-medium">{workspaceName}</span>
        </div>

        {appliedPatch && (
          <div className="flex items-center space-x-2 bg-emerald-800/80 px-2 py-0.5 rounded text-emerald-100">
            <Check size={12} className="text-emerald-300" />
            <span className="text-[11px]">Fix applied to {appliedPatch.path}</span>
            <button
              onClick={onUndo}
              className="flex items-center space-x-1 underline hover:text-white font-medium"
              title="Undo last applied fix"
            >
              <RotateCcw size={10} />
              <span>Undo</span>
            </button>
          </div>
        )}
      </div>

      {/* Right side info */}
      <div className="flex items-center space-x-3">
        {getAgentStatusDisplay()}

        {activeFile && (
          <>
            <div className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </div>
            <div className="hidden sm:inline hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
              Spaces: 4
            </div>
            <div className="hidden sm:inline hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
              UTF-8
            </div>
            <div className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer font-medium">
              {language}
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
