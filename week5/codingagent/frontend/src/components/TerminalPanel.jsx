import React, { useRef, useEffect } from "react";
import {
  Terminal,
  Play,
  RotateCcw,
  Trash2,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
} from "lucide-react";

export default function TerminalPanel({
  isOpen,
  isRunning,
  result, // { ok, exit_code, stdout, stderr, duration, cmd, file }
  onClose,
  onClear,
  onAskAgentFix,
}) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [result, isRunning]);

  if (!isOpen) return null;

  const hasStderr = result && result.stderr && result.stderr.trim().length > 0;
  const isError = result && !result.ok;

  const handleFixError = () => {
    if (!result) return;
    const errorText = result.stderr || result.stdout;
    const prompt = `I ran "${result.cmd}" on ${result.file} and got the following error:\n\`\`\`\n${errorText}\n\`\`\`\nPlease inspect the code, find the root cause, and propose a clean fix.`;
    onAskAgentFix(result.file, 1, prompt);
  };

  return (
    <div className="h-56 bg-[#181818] border-t border-[#2d2d2d] flex flex-col font-mono text-xs select-none z-20 flex-shrink-0 animate-slideUp">
      {/* Panel Header */}
      <div className="h-8 bg-[#252526] border-b border-[#2d2d2d] flex items-center justify-between px-3 text-[11px] select-none">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-white font-sans font-semibold border-b-2 border-sky-400 py-1.5">
            <Terminal size={13} className="text-sky-400" />
            <span>TERMINAL / OUTPUT</span>
          </div>

          {isRunning && (
            <span className="flex items-center space-x-1 text-sky-400 font-sans font-medium animate-pulse">
              <Loader2 size={12} className="animate-spin" />
              <span>Running code...</span>
            </span>
          )}

          {!isRunning && result && (
            <span
              className={`flex items-center space-x-1 font-sans font-medium px-2 py-0.5 rounded text-[10px] ${
                result.ok
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : "bg-rose-950 text-rose-300 border border-rose-800"
              }`}
            >
              {result.ok ? (
                <CheckCircle2 size={11} className="text-emerald-400" />
              ) : (
                <AlertCircle size={11} className="text-rose-400" />
              )}
              <span>Exit code: {result.exit_code}</span>
              <span className="text-neutral-500">({result.duration}s)</span>
            </span>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2">
          {hasStderr && (
            <button
              onClick={handleFixError}
              className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-800 font-sans font-medium text-[11px] transition-colors shadow"
              title="Send traceback to AI Agent to fix"
            >
              <Sparkles size={12} className="text-sky-400" />
              <span>Fix with AI Agent</span>
            </button>
          )}

          <button
            onClick={onClear}
            title="Clear Output"
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#333333] rounded transition-colors"
          >
            <Trash2 size={13} />
          </button>

          <button
            onClick={onClose}
            title="Close Panel"
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#333333] rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div
        ref={terminalRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-[12px] leading-relaxed text-[#d4d4d4] space-y-1.5 scrollbar-thin select-text"
      >
        {!result && !isRunning ? (
          <div className="text-neutral-500 italic font-sans text-xs pt-4 text-center">
            Click "▶ Run Code" in the editor toolbar (or press F5) to execute the current file and see the output here.
          </div>
        ) : null}

        {result && (
          <div>
            <div className="text-neutral-400 flex items-center space-x-1">
              <span className="text-emerald-400 font-bold">$</span>
              <span>python {result.file}</span>
            </div>

            {/* Standard output */}
            {result.stdout && (
              <div className="whitespace-pre-wrap text-[#d4d4d4] mt-1">
                {result.stdout}
              </div>
            )}

            {/* Standard error / Exception */}
            {result.stderr && (
              <div className="whitespace-pre-wrap text-rose-400 bg-rose-950/20 p-2 rounded border border-rose-900/50 mt-1">
                {result.stderr}
              </div>
            )}

            <div className="text-neutral-500 text-[11px] pt-1">
              [Process completed with exit code {result.exit_code} in {result.duration}s]
            </div>
          </div>
        )}

        {isRunning && (
          <div className="flex items-center space-x-2 text-sky-400">
            <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-sky-400"></span>
            <span>Executing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
