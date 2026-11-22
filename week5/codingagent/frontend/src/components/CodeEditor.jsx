import React, { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Sparkles, Save, Play, Loader2 } from "lucide-react";

/**
 * Maps file extensions to Monaco language identifiers.
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
    case "sh":
      return "shell";
    case "sql":
      return "sql";
    case "yaml":
    case "yml":
      return "yaml";
    case "toml":
    case "ini":
      return "ini";
    case "xml":
      return "xml";
    default:
      return "plaintext";
  }
}

export default function CodeEditor({
  path,
  content = "",
  isDirty = false,
  isRunningCode = false,
  onChange,
  onSave,
  onRunCode,
  onCursorChange,
  onAskAgentFix,
  flashRange, // { startLine, endLine }
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  const language = getMonacoLanguage(path);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor movement
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    // Save with Ctrl+S (Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });

    // Run code with F5
    editor.addCommand(monaco.KeyCode.F5, () => {
      if (onRunCode) onRunCode(path);
    });
  };

  // Flash decoration when a fix is applied
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !flashRange) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Scroll to changed line
    editor.revealLineInCenter(flashRange.startLine);

    // Apply flash highlight decoration
    const newDecorations = [
      {
        range: new monaco.Range(
          flashRange.startLine,
          1,
          flashRange.endLine,
          1
        ),
        options: {
          isWholeLine: true,
          className: "bg-emerald-950/70 border-l-4 border-emerald-500",
          inlineClassName: "text-emerald-300 font-semibold",
        },
      },
    ];

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );

    const timer = setTimeout(() => {
      if (editorRef.current) {
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current,
          []
        );
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [flashRange]);

  const handleFixCurrentSelection = () => {
    if (!editorRef.current) {
      onAskAgentFix(path, 1, "");
      return;
    }
    const selection = editorRef.current.getSelection();
    const selectedText = editorRef.current
      .getModel()
      .getValueInRange(selection);
    const startLine = selection ? selection.startLineNumber : 1;
    onAskAgentFix(path, startLine, selectedText);
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden select-none">
      {/* Breadcrumb & Actions Bar */}
      <div className="h-8 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center justify-between px-3 text-xs text-[#a0a0a0]">
        <div className="flex items-center space-x-1.5 truncate">
          <span className="font-mono text-[#cccccc] truncate">{path}</span>
          {isDirty && (
            <span className="text-blue-400 font-medium text-[11px]">
              (unsaved)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Run Code Button */}
          <button
            onClick={() => onRunCode && onRunCode(path)}
            disabled={isRunningCode}
            title="Run Code (F5)"
            className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors text-[11px] font-medium shadow-xs disabled:opacity-50"
          >
            {isRunningCode ? (
              <Loader2 size={12} className="animate-spin text-emerald-400" />
            ) : (
              <Play size={12} className="text-emerald-400 fill-emerald-400" />
            )}
            <span>{isRunningCode ? "Running..." : "Run"}</span>
          </button>

          {/* Save Button */}
          <button
            onClick={onSave}
            title="Save file (Ctrl+S)"
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              isDirty
                ? "bg-[#007acc] text-white hover:bg-[#0062a3]"
                : "text-neutral-400 hover:text-white hover:bg-[#2d2d2d]"
            }`}
          >
            <Save size={12} />
            <span>Save</span>
          </button>

          {/* Fix Bug Button */}
          <button
            onClick={handleFixCurrentSelection}
            title="Ask AI Agent to fix bugs in this file"
            className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900 transition-colors text-[11px] font-medium"
          >
            <Sparkles size={12} className="text-sky-400" />
            <span>Fix this bug</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={content}
          theme="vs-dark"
          onChange={(newVal) => onChange(newVal || "")}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: "Consolas, 'Courier New', monospace",
            lineNumbers: "on",
            minimap: { enabled: true },
            bracketPairColorization: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            tabSize: 4,
            renderWhitespace: "selection",
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>
    </div>
  );
}
