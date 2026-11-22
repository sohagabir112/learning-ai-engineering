import React, { useState, useRef, useEffect } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { Check, X, AlertTriangle, ArrowRight, CornerDownLeft } from "lucide-react";

/**
 * Maps file extension to Monaco language.
 */
function getMonacoLanguage(filePath) {
  if (!filePath) return "plaintext";
  const ext = filePath.split(".").pop().toLowerCase();
  switch (ext) {
    case "py":
      return "python";
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

export default function DiffReview({ patch, onAccept, onReject }) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const diffEditorRef = useRef(null);

  const language = getMonacoLanguage(patch?.path);

  const handleDiffMount = (editor) => {
    diffEditorRef.current = editor;
    if (patch?.start_line) {
      try {
        const modifiedEditor = editor.getModifiedEditor();
        modifiedEditor.revealLineInCenter(patch.start_line);
      } catch {
        // ignore
      }
    }
  };

  const handleConfirmReject = () => {
    onReject(rejectReason.trim());
    setShowRejectReason(false);
    setRejectReason("");
  };

  if (!patch) return null;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden select-none border-l border-[#2d2d2d]">
      {/* Review Header Banner */}
      <div className="bg-[#252526] border-b border-[#333333] p-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono text-[11px] font-semibold border border-amber-800">
              PROPOSED FIX
            </span>
            <span className="text-white font-medium font-mono truncate max-w-sm">
              {patch.path}
            </span>
            <span className="text-neutral-400 font-mono text-[11px]">
              (Lines {patch.start_line} - {patch.end_line})
            </span>
          </div>

          {/* Action Buttons */}
          {!showRejectReason ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowRejectReason(true)}
                className="flex items-center space-x-1.5 px-3 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 font-medium transition-colors"
              >
                <X size={14} className="text-rose-400" />
                <span>Reject</span>
              </button>

              <button
                onClick={onAccept}
                className="flex items-center space-x-1.5 px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-medium transition-colors shadow"
              >
                <Check size={14} className="text-emerald-200" />
                <span>Accept Fix</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Explanation */}
        <div className="mt-2.5 px-2.5 py-1.5 rounded bg-[#1e1e1e] border border-[#333333] text-neutral-300 flex items-start space-x-2">
          <span className="text-sky-400 font-semibold flex-shrink-0">
            Why this fix:
          </span>
          <span className="text-[#cccccc] font-sans">{patch.explanation}</span>
        </div>

        {/* Rejection input box */}
        {showRejectReason && (
          <div className="mt-2.5 p-2.5 rounded bg-[#1e1e1e] border border-rose-800/60 animate-fadeIn">
            <div className="text-[11px] text-neutral-300 font-semibold mb-1">
              Provide an optional reason for rejecting (helps the agent fix it):
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. This breaks the edge case when items is empty..."
              rows={2}
              className="w-full bg-[#2d2d2d] text-white text-xs p-2 rounded border border-[#444444] focus:outline-none focus:border-rose-500 font-sans resize-none"
              autoFocus
            />
            <div className="mt-2 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowRejectReason(false)}
                className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex items-center space-x-1 px-3 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-medium transition-colors"
              >
                <CornerDownLeft size={13} />
                <span>Send Rejection</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Monaco Diff Editor */}
      <div className="flex-1 w-full overflow-hidden">
        <DiffEditor
          height="100%"
          language={language}
          original={patch.original_content}
          modified={patch.modified_content}
          theme="vs-dark"
          onMount={handleDiffMount}
          options={{
            readOnly: true,
            renderSideBySide: true,
            automaticLayout: true,
            fontSize: 14,
            fontFamily: "Consolas, 'Courier New', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            renderIndicators: true,
          }}
        />
      </div>
    </div>
  );
}
