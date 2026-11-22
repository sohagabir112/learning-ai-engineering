import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCode,
  RotateCcw,
  X,
  ChevronDown,
  Info,
} from "lucide-react";
import ToolLog from "./ToolLog";

export default function AgentPanel({
  status,
  statusText,
  messages = [],
  toolCalls = [],
  pendingPatch,
  appliedPatch,
  error,
  activeFile,
  cursorLine,
  onStartAgent,
  onUndo,
  onClearSession,
  onClose,
}) {
  const [bugInput, setBugInput] = useState("");
  const [attachContext, setAttachContext] = useState(true);
  const messagesEndRef = useRef(null);

  const isThinking = status === "thinking";
  const isWaitingReview = status === "waiting_for_review";

  // Auto-scroll chat feed to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls, statusText, pendingPatch, appliedPatch, error]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!bugInput.trim() || isThinking || isWaitingReview) return;

    const fileContext = attachContext && activeFile ? activeFile : null;
    const lineContext = attachContext && activeFile ? cursorLine : null;

    onStartAgent(bugInput.trim(), fileContext, lineContext);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertSampleBug = (text) => {
    setBugInput(text);
  };

  return (
    <div className="h-full flex flex-col bg-[#252526] text-[#cccccc] border-l border-[#1e1e1e] select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333333] bg-[#252526]">
        <div className="flex items-center space-x-2">
          <Sparkles size={16} className="text-sky-400" />
          <span className="font-semibold text-xs text-white">AI Bug-Fixing Agent</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#333333] text-neutral-400 font-mono">
            gpt-oss-120b
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {onClose && (
            <button
              onClick={onClose}
              title="Close panel"
              className="p-1 text-neutral-400 hover:text-white hover:bg-[#333333] rounded transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Attached Context Banner */}
      {activeFile && (
        <div className="px-3 py-1.5 bg-[#1e1e1e] border-b border-[#333333] flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-1.5 truncate text-neutral-300">
            <FileCode size={13} className="text-sky-400 flex-shrink-0" />
            <span className="text-neutral-500 font-sans">Context:</span>
            <span className="font-mono text-yellow-400 truncate max-w-[150px]">
              {activeFile}
            </span>
            {cursorLine && (
              <span className="text-neutral-500 font-mono">:Ln {cursorLine}</span>
            )}
          </div>

          <label className="flex items-center space-x-1 text-[11px] text-neutral-400 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={attachContext}
              onChange={(e) => setAttachContext(e.target.checked)}
              className="rounded bg-[#333333] border-[#444444] text-[#007acc] focus:ring-0 w-3 h-3"
            />
            <span>Include</span>
          </label>
        </div>
      )}

      {/* Chat & Stream Activity Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-xs scrollbar-thin">
        {messages.length === 0 && toolCalls.length === 0 && !error && !isThinking ? (
          <div className="text-center py-6 px-2 text-[#858585] space-y-3">
            <div className="w-10 h-10 rounded-full bg-sky-950/60 border border-sky-800 text-sky-400 flex items-center justify-center mx-auto">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="font-medium text-neutral-300">No active bug report</p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Describe a bug or paste a traceback below. The agent will search your project, locate the cause, and propose a clean diff.
              </p>
            </div>

            {/* Quick bug templates */}
            <div className="pt-2 text-left space-y-1.5">
              <div className="text-[10px] uppercase font-semibold text-neutral-500">
                Quick test templates:
              </div>
              <button
                onClick={() =>
                  insertSampleBug(
                    "Division by zero error in calculator when dividing by 0. Please fix it to return 0 or handle it gracefully."
                  )
                }
                className="w-full text-left p-2 rounded bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#333333] text-[11px] text-[#cccccc] transition-colors"
              >
                1. "Division by zero in calculator"
              </button>
              <button
                onClick={() =>
                  insertSampleBug(
                    "IndexError: list index out of range when fetching the latest element."
                  )
                }
                className="w-full text-left p-2 rounded bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#333333] text-[11px] text-[#cccccc] transition-colors"
              >
                2. "IndexError: list index out of range"
              </button>
            </div>
          </div>
        ) : null}

        {/* Stream Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="p-3 rounded-lg bg-[#1e1e1e] border border-[#333333] text-[#d4d4d4] leading-relaxed shadow-sm"
          >
            <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1.5 pb-1 border-b border-[#2d2d2d]">
              <span className="font-semibold text-sky-400">Agent</span>
              <span>{msg.timestamp}</span>
            </div>
            <div className="whitespace-pre-wrap font-sans text-xs">
              {msg.content}
            </div>
          </div>
        ))}

        {/* Collapsible Tool Log */}
        <ToolLog tools={toolCalls} />

        {/* Pending Patch Indicator Banner */}
        {pendingPatch && (
          <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-700/80 text-amber-200 animate-pulse space-y-1">
            <div className="flex items-center space-x-2 font-semibold text-amber-300 text-xs">
              <Sparkles size={14} />
              <span>Patch Proposed!</span>
            </div>
            <div className="text-[11px]">
              Review the diff in the editor window. Accept or reject the patch.
            </div>
          </div>
        )}

        {/* Applied Patch Banner */}
        {appliedPatch && (
          <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-700 text-emerald-200 flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span className="text-xs truncate">Fix applied to {appliedPatch.path}</span>
            </div>
            <button
              onClick={onUndo}
              className="flex items-center space-x-1 px-2 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-xs text-white font-medium ml-2 flex-shrink-0"
              title="Undo this change"
            >
              <RotateCcw size={12} />
              <span>Undo</span>
            </button>
          </div>
        )}

        {/* Error message banner */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 flex items-start space-x-2">
            <AlertCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">{error}</div>
          </div>
        )}

        {/* Agent Working Spinner */}
        {isThinking && (
          <div className="flex items-center space-x-2 p-2 rounded bg-[#1e1e1e] border border-[#333333] text-sky-300 text-xs">
            <Loader2 size={14} className="animate-spin text-sky-400 flex-shrink-0" />
            <span className="truncate">{statusText || "Analyzing codebase..."}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#1e1e1e] border-t border-[#333333]">
        <div className="relative">
          <textarea
            value={bugInput}
            onChange={(e) => setBugInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking || isWaitingReview}
            placeholder={
              isWaitingReview
                ? "Review pending fix above first..."
                : "Describe the bug, paste traceback or error..."
            }
            rows={3}
            className="w-full bg-[#2d2d2d] text-white text-xs p-2.5 rounded-lg border border-[#3e3e42] focus:outline-none focus:border-[#007acc] resize-none disabled:opacity-50 scrollbar-thin"
          />

          <div className="flex items-center justify-between mt-2">
            <div className="text-[10px] text-neutral-500">
              Press <span className="font-mono text-neutral-400">Ctrl+Enter</span> to send
            </div>

            <div className="flex items-center space-x-2">
              {messages.length > 0 && !isThinking && (
                <button
                  type="button"
                  onClick={onClearSession}
                  className="px-2 py-1 text-[11px] text-neutral-400 hover:text-white hover:bg-[#2d2d2d] rounded"
                >
                  Clear
                </button>
              )}

              <button
                type="submit"
                disabled={!bugInput.trim() || isThinking || isWaitingReview}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow"
              >
                {isThinking ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Fix Bug</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
