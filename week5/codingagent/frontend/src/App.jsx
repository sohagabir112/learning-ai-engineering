import React, { useState, useEffect, useCallback } from "react";
import ActivityBar from "./components/ActivityBar";
import FileExplorer from "./components/FileExplorer";
import EditorTabs from "./components/EditorTabs";
import CodeEditor from "./components/CodeEditor";
import DiffReview from "./components/DiffReview";
import AgentPanel from "./components/AgentPanel";
import StatusBar from "./components/StatusBar";
import OpenFolderModal from "./components/OpenFolderModal";
import TerminalPanel from "./components/TerminalPanel";
import { useAgentStream } from "./hooks/useAgentStream";
import {
  fetchTree,
  fetchFile,
  saveFile,
  createFile,
  deleteFile,
  fetchWorkspace,
  changeWorkspace,
  executeCode,
} from "./api";
import {
  Command,
  Terminal,
  Sparkles,
  FolderOpen,
  Save,
  RotateCcw,
  Play,
  ChevronLeft,
} from "lucide-react";

export default function App() {
  // Navigation & panels
  const [activeView, setActiveView] = useState("explorer"); // "explorer" | "search" | "agent"
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAgentPanel, setShowAgentPanel] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [showOpenFolderModal, setShowOpenFolderModal] = useState(false);

  // Terminal & Execution
  const [showTerminal, setShowTerminal] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [terminalResult, setTerminalResult] = useState(null);

  // Workspace & Files
  const [workspaceName, setWorkspaceName] = useState("project");
  const [workspaceRootPath, setWorkspaceRootPath] = useState("");
  const [tree, setTree] = useState([]);
  const [openTabs, setOpenTabs] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [fileContents, setFileContents] = useState({});
  const [dirtyMap, setDirtyMap] = useState({});
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [flashRange, setFlashRange] = useState(null);

  // Agent hook
  const {
    status: agentStatus,
    statusText: agentStatusText,
    messages: agentMessages,
    toolCalls: agentToolCalls,
    pendingPatch,
    appliedPatch,
    error: agentError,
    startAgent,
    acceptFix,
    rejectFix,
    undo,
    clearSession,
  } = useAgentStream();

  // CRITICAL: Always auto-open the Agent Panel whenever the agent is working or waiting for review
  useEffect(() => {
    if (agentStatus === "thinking" || agentStatus === "waiting_for_review") {
      setShowAgentPanel(true);
    }
  }, [agentStatus]);

  // Load initial workspace info and directory tree
  const loadWorkspace = useCallback(async () => {
    try {
      const ws = await fetchWorkspace();
      setWorkspaceName(ws.name || "project");
      setWorkspaceRootPath(ws.workspace_root || "");
    } catch {
      // fallback
    }

    try {
      const data = await fetchTree();
      setTree(data.tree || []);

      // Auto-open first source file if none open
      if (!activePath && data.tree && data.tree.length > 0) {
        const findFirstFile = (nodes) => {
          for (const node of nodes) {
            if (node.type === "file") return node.path;
            if (node.children) {
              const f = findFirstFile(node.children);
              if (f) return f;
            }
          }
          return null;
        };
        const first = findFirstFile(data.tree);
        if (first) {
          handleOpenFile(first);
        }
      }
    } catch (err) {
      console.error("Failed to load workspace tree:", err);
    }
  }, [activePath]);

  useEffect(() => {
    loadWorkspace();
  }, []);

  // Handle opening a new folder/workspace
  const handleSelectFolder = async (newFolder) => {
    try {
      const res = await changeWorkspace(newFolder);
      setWorkspaceName(res.name);
      setWorkspaceRootPath(res.workspace_root);
      setOpenTabs([]);
      setActivePath(null);
      setFileContents({});
      setDirtyMap({});
      const data = await fetchTree();
      setTree(data.tree || []);

      // Auto-open first file in new folder
      if (data.tree && data.tree.length > 0) {
        const first = data.tree.find((n) => n.type === "file");
        if (first) {
          handleOpenFile(first.path);
        }
      }
    } catch (err) {
      alert(`Could not open folder: ${err.message}`);
    }
  };

  // Open file in editor
  const handleOpenFile = async (path, targetLine = null) => {
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => [...prev, path]);
    }
    setActivePath(path);

    if (fileContents[path] === undefined) {
      try {
        const data = await fetchFile(path);
        setFileContents((prev) => ({ ...prev, [path]: data.content }));
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    }

    if (targetLine) {
      setCursorPos({ line: targetLine, column: 1 });
      setFlashRange({ startLine: targetLine, endLine: targetLine });
    }
  };

  // Close tab
  const handleCloseTab = (path) => {
    if (dirtyMap[path]) {
      const confirmClose = window.confirm(
        `"${path}" has unsaved changes. Close anyway?`
      );
      if (!confirmClose) return;
    }

    setOpenTabs((prev) => prev.filter((p) => p !== path));
    setDirtyMap((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });

    if (activePath === path) {
      const remaining = openTabs.filter((p) => p !== path);
      setActivePath(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    }
  };

  // Change content of active file
  const handleContentChange = (newVal) => {
    if (!activePath) return;
    setFileContents((prev) => ({ ...prev, [activePath]: newVal }));
    setDirtyMap((prev) => ({ ...prev, [activePath]: true }));
  };

  // Save active file
  const handleSaveFile = async (pathToSave = activePath) => {
    if (!pathToSave) return;
    const content = fileContents[pathToSave] ?? "";
    try {
      await saveFile(pathToSave, content);
      setDirtyMap((prev) => ({ ...prev, [pathToSave]: false }));
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  };

  // Run code file in terminal
  const handleRunCode = async (path = activePath) => {
    if (!path) return;
    // Save first if dirty
    if (dirtyMap[path]) {
      await handleSaveFile(path);
    }
    setShowTerminal(true);
    setIsRunningCode(true);
    setTerminalResult(null);

    try {
      const res = await executeCode(path);
      setTerminalResult(res);
    } catch (err) {
      setTerminalResult({
        ok: false,
        exit_code: 1,
        stdout: "",
        stderr: err.message || "Failed to execute file.",
        duration: 0.0,
        cmd: path,
        file: path,
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  // Create file or folder
  const handleCreateFile = async (name, isDir = false) => {
    try {
      await createFile(name, isDir);
      await loadWorkspace();
      if (!isDir) {
        await handleOpenFile(name);
      }
    } catch (err) {
      alert(`Create failed: ${err.message}`);
    }
  };

  // Delete file
  const handleDeleteFile = async (path) => {
    try {
      await deleteFile(path);
      handleCloseTab(path);
      await loadWorkspace();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Trigger agent fix from CodeEditor context or terminal
  const handleAskAgentFix = (file, line, selection) => {
    setShowAgentPanel(true);
    setActiveView("agent");
    const sampleBug = selection
      ? selection
      : `There is a bug in ${file} around line ${line}. Please locate the root cause and propose a fix.`;
    startAgent(sampleBug, file, line);
  };

  // Handle patch acceptance
  const handleAcceptPatch = async () => {
    if (!pendingPatch) return;
    const patchPath = pendingPatch.path;
    const patchStart = pendingPatch.start_line;
    const patchEnd = pendingPatch.end_line;

    await acceptFix();

    // Reload modified file from disk
    try {
      const data = await fetchFile(patchPath);
      setFileContents((prev) => ({ ...prev, [patchPath]: data.content }));
      setDirtyMap((prev) => ({ ...prev, [patchPath]: false }));
      if (activePath !== patchPath) {
        handleOpenFile(patchPath);
      }
      setFlashRange({ startLine: patchStart, endLine: patchEnd });
    } catch (err) {
      console.error("Failed to reload patched file:", err);
    }
  };

  // Handle patch rejection
  const handleRejectPatch = async (reason) => {
    await rejectFix(reason);
  };

  // Handle Undo
  const handleUndoPatch = async () => {
    const res = await undo();
    if (res && res.path) {
      try {
        const data = await fetchFile(res.path);
        setFileContents((prev) => ({ ...prev, [res.path]: data.content }));
        setDirtyMap((prev) => ({ ...prev, [res.path]: false }));
      } catch (err) {
        console.error("Failed to reload undone file:", err);
      }
    }
  };

  // Activity Bar view selection
  const handleSelectView = (view) => {
    if (view === "agent") {
      setShowAgentPanel((prev) => !prev);
      return;
    }
    if (activeView === view && showSidebar) {
      setShowSidebar(false);
    } else {
      setActiveView(view);
      setShowSidebar(true);
    }
  };

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSaveFile();
      }
      // F5 (Run Code)
      if (e.key === "F5") {
        e.preventDefault();
        if (activePath) handleRunCode(activePath);
      }
      // Ctrl+Shift+P / Cmd+Shift+P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        setCommandSearch("");
      }
      // Ctrl+B / Cmd+B (toggle sidebar)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setShowSidebar((prev) => !prev);
      }
      // Escape
      if (e.key === "Escape") {
        setShowCommandPalette(false);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activePath, fileContents, dirtyMap]);

  // Command palette commands
  const commands = [
    {
      id: "run_file",
      label: "Run: Run Active File",
      hint: "F5",
      action: () => activePath && handleRunCode(activePath),
    },
    {
      id: "open_folder",
      label: "File: Open Folder / Change Workspace...",
      hint: "Select folder",
      action: () => setShowOpenFolderModal(true),
    },
    {
      id: "save",
      label: "File: Save",
      hint: "Ctrl+S",
      action: () => handleSaveFile(),
    },
    {
      id: "toggle_terminal",
      label: "View: Toggle Terminal / Output Panel",
      hint: "",
      action: () => setShowTerminal((prev) => !prev),
    },
    {
      id: "toggle_sidebar",
      label: "View: Toggle Sidebar",
      hint: "Ctrl+B",
      action: () => setShowSidebar((prev) => !prev),
    },
    {
      id: "open_agent",
      label: "Agent: Toggle AI Agent Panel",
      hint: "Ctrl+Shift+A",
      action: () => setShowAgentPanel((prev) => !prev),
    },
    {
      id: "fix_bug",
      label: "Agent: Fix This Bug",
      hint: "Send active file to agent",
      action: () => {
        if (activePath) {
          handleAskAgentFix(activePath, cursorPos.line, "");
        } else {
          setShowAgentPanel(true);
        }
      },
    },
    {
      id: "undo_fix",
      label: "Agent: Undo Last Fix",
      hint: "Restore .bak file",
      action: () => handleUndoPatch(),
    },
    {
      id: "refresh_tree",
      label: "Workspace: Refresh File Explorer",
      hint: "",
      action: () => loadWorkspace(),
    },
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(commandSearch.toLowerCase())
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden">
      {/* Top Application Bar / Header */}
      <header className="h-9 bg-[#323233] border-b border-[#252526] flex items-center justify-between px-3 text-xs select-none z-30 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-semibold text-white">
            <span className="text-sky-400 font-bold text-sm">VS</span>
            <span>Code AI Agent</span>
          </div>

          {/* Open Folder Quick Selector */}
          <button
            onClick={() => setShowOpenFolderModal(true)}
            title="Click to open or change workspace folder"
            className="flex items-center space-x-1.5 bg-[#252526] hover:bg-[#3c3c3c] text-neutral-300 hover:text-white px-2 py-0.5 rounded border border-[#3e3e42] transition-colors"
          >
            <FolderOpen size={13} className="text-[#dcb67a]" />
            <span className="font-mono text-[11px] font-medium">{workspaceName}</span>
            <span className="text-[10px] text-neutral-500 hidden sm:inline">(Open Folder)</span>
          </button>
        </div>

        {/* Command Palette Trigger in Header */}
        <button
          onClick={() => {
            setShowCommandPalette(true);
            setCommandSearch("");
          }}
          className="flex items-center space-x-2 bg-[#252526] hover:bg-[#3c3c3c] text-neutral-400 hover:text-white px-3 py-1 rounded-md text-xs border border-[#3e3e42] transition-colors max-w-sm w-full mx-4 justify-between"
        >
          <div className="flex items-center space-x-1.5 truncate">
            <Command size={13} className="text-neutral-400" />
            <span className="truncate">Type a command or search...</span>
          </div>
          <span className="text-[10px] bg-[#333333] px-1.5 py-0.5 rounded text-neutral-400 font-mono">
            Ctrl+Shift+P
          </span>
        </button>

        {/* Right Header Actions */}
        <div className="flex items-center space-x-2">
          {/* Run Code Button in Header */}
          {activePath && (
            <button
              onClick={() => handleRunCode(activePath)}
              disabled={isRunningCode}
              title="Run Code (F5)"
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-medium transition-colors"
            >
              <Play size={12} className="text-emerald-400 fill-emerald-400" />
              <span>Run</span>
            </button>
          )}

          {/* Copilot Agent Toggle Button */}
          <button
            onClick={() => setShowAgentPanel((prev) => !prev)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs transition-colors ${
              showAgentPanel
                ? "bg-sky-950 text-sky-300 border border-sky-800"
                : "text-neutral-400 hover:text-white hover:bg-[#252526] border border-transparent"
            } ${
              agentStatus === "thinking" || agentStatus === "waiting_for_review"
                ? "animate-pulse ring-1 ring-sky-400"
                : ""
            }`}
          >
            <Sparkles size={13} className="text-sky-400" />
            <span className="font-medium">Copilot Agent</span>
            {agentStatus === "thinking" && (
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            )}
            {agentStatus === "waiting_for_review" && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Activity Bar */}
        <ActivityBar
          activeView={activeView}
          onSelectView={handleSelectView}
          agentStatus={agentStatus}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
        />

        {/* Sidebar (File Explorer / Search) */}
        {showSidebar && (
          <aside className="w-64 sm:w-72 flex-shrink-0 h-full border-r border-[#2d2d2d] z-10 transition-all">
            <FileExplorer
              tree={tree}
              workspaceName={workspaceName}
              activeFilePath={activePath}
              activeView={activeView}
              onOpenFile={handleOpenFile}
              onRefresh={loadWorkspace}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onOpenFolder={() => setShowOpenFolderModal(true)}
            />
          </aside>
        )}

        {/* Center Editor / Diff / Terminal Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-[#1e1e1e] overflow-hidden">
          {/* Tabs bar */}
          <EditorTabs
            openTabs={openTabs}
            activePath={activePath}
            dirtyMap={dirtyMap}
            onSelectTab={(path) => setActivePath(path)}
            onCloseTab={handleCloseTab}
          />

          {/* Editor or Diff Review or Empty state */}
          <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 relative overflow-hidden">
              {pendingPatch ? (
                <DiffReview
                  patch={pendingPatch}
                  onAccept={handleAcceptPatch}
                  onReject={handleRejectPatch}
                />
              ) : activePath ? (
                <CodeEditor
                  path={activePath}
                  content={fileContents[activePath] ?? ""}
                  isDirty={!!dirtyMap[activePath]}
                  isRunningCode={isRunningCode}
                  onChange={handleContentChange}
                  onSave={() => handleSaveFile(activePath)}
                  onRunCode={handleRunCode}
                  onCursorChange={setCursorPos}
                  onAskAgentFix={handleAskAgentFix}
                  flashRange={flashRange}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none text-neutral-500 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#252526] border border-[#333333] flex items-center justify-center text-sky-400 shadow-lg">
                    <FolderOpen size={30} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-neutral-300">
                      Workspace: {workspaceName}
                    </h3>
                    <p className="text-xs text-neutral-500 max-w-sm mt-1">
                      Select a file from the explorer on the left, open a folder, or press{" "}
                      <span className="font-mono text-sky-400">Ctrl+Shift+P</span>.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowOpenFolderModal(true)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-medium transition-colors shadow"
                  >
                    <FolderOpen size={14} />
                    <span>Open Folder...</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Terminal / Output Drawer */}
            <TerminalPanel
              isOpen={showTerminal}
              isRunning={isRunningCode}
              result={terminalResult}
              onClose={() => setShowTerminal(false)}
              onClear={() => setTerminalResult(null)}
              onAskAgentFix={handleAskAgentFix}
            />
          </div>
        </main>

        {/* Right Docked Agent Chat Panel */}
        {showAgentPanel ? (
          <aside className="w-80 sm:w-96 flex-shrink-0 h-full z-10 transition-all border-l border-[#2d2d2d]">
            <AgentPanel
              status={agentStatus}
              statusText={agentStatusText}
              messages={agentMessages}
              toolCalls={agentToolCalls}
              pendingPatch={pendingPatch}
              appliedPatch={appliedPatch}
              error={agentError}
              activeFile={activePath}
              cursorLine={cursorPos.line}
              onStartAgent={startAgent}
              onUndo={handleUndoPatch}
              onClearSession={clearSession}
              onClose={() => setShowAgentPanel(false)}
            />
          </aside>
        ) : (
          /* Subtle side pill when Agent Panel is collapsed */
          <div
            onClick={() => setShowAgentPanel(true)}
            title="Open AI Bug-Fixing Agent Panel"
            className="w-7 bg-[#252526] hover:bg-[#2d2d2d] border-l border-[#333333] flex flex-col items-center justify-center cursor-pointer transition-colors select-none text-neutral-400 hover:text-sky-300 group"
          >
            <Sparkles size={14} className="text-sky-400 group-hover:scale-110 transition-transform mb-3" />
            <span
              className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 group-hover:text-white"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              Copilot Agent
            </span>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        workspaceName={workspaceName}
        activeFile={activePath}
        cursorPosition={cursorPos}
        language={
          activePath
            ? activePath.split(".").pop().toUpperCase()
            : "Plain Text"
        }
        agentStatus={agentStatus}
        appliedPatch={appliedPatch}
        onUndo={handleUndoPatch}
      />

      {/* Open Folder Modal */}
      <OpenFolderModal
        isOpen={showOpenFolderModal}
        currentPath={workspaceRootPath}
        onClose={() => setShowOpenFolderModal(false)}
        onSelectFolder={handleSelectFolder}
      />

      {/* Command Palette Modal (Ctrl+Shift+P) */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 z-50 p-4"
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            className="w-full max-w-lg bg-[#252526] rounded-lg border border-[#444444] shadow-2xl overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-3 py-2 border-b border-[#333333] bg-[#1e1e1e]">
              <Terminal size={15} className="text-sky-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Type a command to run..."
                className="w-full bg-transparent text-white text-xs focus:outline-none"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto py-1 scrollbar-thin">
              {filteredCommands.length === 0 ? (
                <div className="text-xs text-neutral-500 p-3 text-center">
                  No matching commands.
                </div>
              ) : (
                filteredCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      setShowCommandPalette(false);
                      cmd.action();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#007acc] hover:text-white transition-colors group"
                  >
                    <span className="font-medium text-[#cccccc] group-hover:text-white">
                      {cmd.label}
                    </span>
                    {cmd.hint && (
                      <span className="text-[11px] text-neutral-500 group-hover:text-neutral-200 font-mono">
                        {cmd.hint}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
