import React, { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  ArrowUp,
  CornerLeftUp,
  Check,
  X,
  Search,
  Loader2,
  HardDrive,
} from "lucide-react";
import { listFolders } from "../api";

export default function OpenFolderModal({
  currentPath = "",
  isOpen,
  onClose,
  onSelectFolder,
}) {
  const [inputPath, setInputPath] = useState(currentPath);
  const [browsePath, setBrowsePath] = useState(currentPath);
  const [folders, setFolders] = useState([]);
  const [parentPath, setParentPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setInputPath(currentPath);
      setBrowsePath(currentPath);
      loadDirectory(currentPath);
    }
  }, [isOpen, currentPath]);

  const loadDirectory = async (path) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFolders(path);
      setFolders(data.folders || []);
      setParentPath(data.parent);
      setBrowsePath(data.current);
      setInputPath(data.current);
    } catch (err) {
      setError(err.message || "Could not list folders.");
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderPath) => {
    loadDirectory(folderPath);
  };

  const handleParentClick = () => {
    if (parentPath) {
      loadDirectory(parentPath);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputPath.trim()) return;
    onSelectFolder(inputPath.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#252526] rounded-xl border border-[#444444] shadow-2xl overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333] bg-[#1e1e1e]">
          <div className="flex items-center space-x-2">
            <FolderOpen size={18} className="text-[#dcb67a]" />
            <span className="font-semibold text-sm text-white">
              Open Folder / Workspace
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-[#333333] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Path Input Form */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-[#333333] space-y-2">
          <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Folder Path
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="e.g. sample_project or C:\path\to\project"
              className="flex-1 bg-[#1e1e1e] text-white text-xs px-3 py-2 rounded-lg border border-[#3e3e42] focus:outline-none focus:border-[#007acc] font-mono"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-medium rounded-lg transition-colors flex items-center space-x-1 shadow"
            >
              <Check size={14} />
              <span>Open</span>
            </button>
          </div>
        </form>

        {/* Directory Browser */}
        <div className="p-4 bg-[#1e1e1e]/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
              Browse Subdirectories
            </div>
            {parentPath && (
              <button
                type="button"
                onClick={handleParentClick}
                className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                <CornerLeftUp size={13} />
                <span>Up one level</span>
              </button>
            )}
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/60 p-2 rounded border border-rose-800 mb-2">
              {error}
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-1 rounded-lg border border-[#333333] bg-[#1e1e1e] p-2 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center p-6 text-neutral-400 text-xs space-x-2">
                <Loader2 size={16} className="animate-spin text-sky-400" />
                <span>Loading folders...</span>
              </div>
            ) : folders.length === 0 ? (
              <div className="text-neutral-500 text-xs p-4 text-center italic">
                No accessible subfolders in this directory.
              </div>
            ) : (
              folders.map((f) => (
                <div
                  key={f.path}
                  onClick={() => handleFolderClick(f.path)}
                  className="flex items-center justify-between px-3 py-2 rounded hover:bg-[#2d2d2d] cursor-pointer text-xs text-neutral-300 hover:text-white transition-colors group"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Folder size={15} className="text-[#dcb67a] flex-shrink-0" />
                    <span className="truncate font-sans font-medium">{f.name}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFolder(f.path);
                      onClose();
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-0.5 rounded bg-[#007acc] text-white hover:bg-[#0062a3] transition-all"
                  >
                    Select
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick presets */}
        <div className="px-4 py-3 bg-[#1e1e1e] border-t border-[#333333] flex items-center justify-between text-xs text-neutral-400">
          <span className="text-[11px]">Quick Open:</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onSelectFolder("sample_project");
                onClose();
              }}
              className="px-2.5 py-1 rounded bg-[#2d2d2d] hover:bg-[#383838] text-sky-300 hover:text-white text-[11px] font-mono transition-colors"
            >
              sample_project
            </button>
            <button
              onClick={() => {
                onSelectFolder(".");
                onClose();
              }}
              className="px-2.5 py-1 rounded bg-[#2d2d2d] hover:bg-[#383838] text-neutral-300 hover:text-white text-[11px] font-mono transition-colors"
            >
              workspace root
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
