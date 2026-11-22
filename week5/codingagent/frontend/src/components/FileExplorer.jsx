import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode2,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Trash2,
  Search,
  Loader2,
  FolderSearch,
} from "lucide-react";
import { searchWorkspace } from "../api";

/**
 * Returns a suitable icon and color for a given file name based on its extension.
 */
function getFileIcon(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  switch (ext) {
    case "py":
      return <FileCode2 size={15} className="text-yellow-400 flex-shrink-0" />;
    case "js":
    case "jsx":
      return <FileCode2 size={15} className="text-amber-300 flex-shrink-0" />;
    case "ts":
    case "tsx":
      return <FileCode2 size={15} className="text-sky-400 flex-shrink-0" />;
    case "json":
      return <FileText size={15} className="text-yellow-500 flex-shrink-0" />;
    case "html":
      return <FileCode2 size={15} className="text-orange-400 flex-shrink-0" />;
    case "css":
      return <FileCode2 size={15} className="text-cyan-400 flex-shrink-0" />;
    case "md":
      return <FileText size={15} className="text-blue-300 flex-shrink-0" />;
    default:
      return <FileText size={15} className="text-neutral-400 flex-shrink-0" />;
  }
}

/**
 * Recursive File & Directory Tree Item
 */
function TreeItem({
  item,
  activeFilePath,
  onOpenFile,
  onDelete,
  expandedPaths,
  toggleExpand,
}) {
  const isDir = item.type === "directory";
  const isExpanded = !!expandedPaths[item.path];
  const isActive = activeFilePath === item.path;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isDir) {
      toggleExpand(item.path);
    } else {
      onOpenFile(item.path);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      onDelete(item.path);
    }
  };

  return (
    <div className="select-none font-sans text-[13px]">
      <div
        onClick={handleClick}
        className={`group flex items-center justify-between px-2 py-1 cursor-pointer transition-colors ${
          isActive
            ? "bg-[#37373d] text-white"
            : "text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
        }`}
      >
        <div className="flex items-center space-x-1.5 truncate">
          {isDir ? (
            <span className="text-[#858585] group-hover:text-white transition-colors">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="w-3.5" />
          )}

          {isDir ? (
            isExpanded ? (
              <FolderOpen size={16} className="text-[#dcb67a] flex-shrink-0" />
            ) : (
              <Folder size={16} className="text-[#dcb67a] flex-shrink-0" />
            )
          ) : (
            getFileIcon(item.name)
          )}

          <span className="truncate">{item.name}</span>
        </div>

        {/* Delete action button on hover */}
        <button
          onClick={handleDelete}
          title={`Delete ${item.name}`}
          className="opacity-0 group-hover:opacity-100 text-[#858585] hover:text-rose-400 p-0.5 rounded transition-opacity"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Render directory children */}
      {isDir && isExpanded && item.children && (
        <div className="pl-3.5 border-l border-[#333333]/50 ml-2">
          {item.children.length === 0 ? (
            <div className="text-[11px] text-[#707070] px-3 py-1 italic">
              Empty folder
            </div>
          ) : (
            item.children.map((child) => (
              <TreeItem
                key={child.path}
                item={child}
                activeFilePath={activeFilePath}
                onOpenFile={onOpenFile}
                onDelete={onDelete}
                expandedPaths={expandedPaths}
                toggleExpand={toggleExpand}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({
  tree = [],
  workspaceName = "WORKSPACE",
  activeFilePath,
  onOpenFile,
  onRefresh,
  onCreateFile,
  onDeleteFile,
  onOpenFolder,
  activeView = "explorer",
}) {
  const [expandedPaths, setExpandedPaths] = useState({});
  const [creatingType, setCreatingType] = useState(null); // 'file' | 'folder' | null
  const [newItemName, setNewItemName] = useState("");

  // Search view state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const toggleExpand = (path) => {
    setExpandedPaths((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleStartCreate = (type) => {
    setCreatingType(type);
    setNewItemName("");
  };

  const handleConfirmCreate = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setCreatingType(null);
      return;
    }
    await onCreateFile(newItemName.trim(), creatingType === "folder");
    setCreatingType(null);
    setNewItemName("");
  };

  const handleSearchSubmit = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const data = await searchWorkspace(searchQuery.trim());
      setSearchResults(data.matches || []);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (activeView === "search") {
    return (
      <div className="h-full flex flex-col bg-[#252526] text-[#cccccc] select-none border-r border-[#1e1e1e]">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#bbbbbb] border-b border-[#333333]">
          Search in Workspace
        </div>

        <form onSubmit={handleSearchSubmit} className="p-3 border-b border-[#333333]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search (e.g. function, variable, bug)..."
              className="w-full bg-[#3c3c3c] text-white text-xs px-2.5 py-1.5 rounded border border-[#3c3c3c] focus:outline-none focus:border-[#007acc] pr-7"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 text-neutral-400 hover:text-white"
            >
              {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            </button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {searchResults.length === 0 ? (
            <div className="text-xs text-[#808080] p-3 text-center">
              {searchQuery ? "No results found." : "Type a query and press Enter."}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] text-[#808080] px-1 font-mono">
                {searchResults.length} match{searchResults.length > 1 ? "es" : ""} found
              </div>
              {searchResults.map((match, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenFile(match.path, match.line)}
                  className="p-2 rounded bg-[#1e1e1e] hover:bg-[#2d2d2d] cursor-pointer text-xs transition-colors border border-[#333333]"
                >
                  <div className="font-semibold text-yellow-400 flex items-center justify-between">
                    <span className="truncate">{match.path}</span>
                    <span className="text-neutral-500 font-mono text-[11px]">
                      :{match.line}
                    </span>
                  </div>
                  <div className="text-[#9cdcfe] font-mono text-[11px] truncate mt-0.5">
                    {match.snippet}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#252526] text-[#cccccc] select-none border-r border-[#1e1e1e]">
      {/* Header with Title and Actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333333]">
        <div
          onClick={onOpenFolder}
          title="Click to change workspace folder"
          className="text-[11px] font-bold uppercase tracking-wider text-[#bbbbbb] hover:text-sky-300 cursor-pointer truncate max-w-[130px] flex items-center space-x-1"
        >
          <span className="truncate">EXPLORER: {workspaceName}</span>
        </div>

        <div className="flex items-center space-x-1 text-[#858585]">
          <button
            title="Open / Change Workspace Folder"
            onClick={onOpenFolder}
            className="p-1 hover:text-white hover:bg-[#333333] rounded transition-colors"
          >
            <FolderOpen size={14} className="text-[#dcb67a]" />
          </button>
          <button
            title="New File"
            onClick={() => handleStartCreate("file")}
            className="p-1 hover:text-white hover:bg-[#333333] rounded transition-colors"
          >
            <FilePlus size={14} />
          </button>
          <button
            title="New Folder"
            onClick={() => handleStartCreate("folder")}
            className="p-1 hover:text-white hover:bg-[#333333] rounded transition-colors"
          >
            <FolderPlus size={14} />
          </button>
          <button
            title="Refresh Explorer"
            onClick={onRefresh}
            className="p-1 hover:text-white hover:bg-[#333333] rounded transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Inline Create Input */}
      {creatingType && (
        <form onSubmit={handleConfirmCreate} className="px-3 py-2 bg-[#1e1e1e] border-b border-[#333333]">
          <div className="text-[10px] uppercase text-sky-400 mb-1 font-semibold">
            Create New {creatingType === "folder" ? "Folder" : "File"}
          </div>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setCreatingType(null)}
            placeholder={creatingType === "folder" ? "folder_name" : "filename.py"}
            className="w-full bg-[#3c3c3c] text-white text-xs px-2 py-1 rounded border border-[#007acc] focus:outline-none"
            autoFocus
          />
          <div className="text-[10px] text-neutral-400 mt-1 flex justify-between">
            <span>Press Enter to save</span>
            <button
              type="button"
              onClick={() => setCreatingType(null)}
              className="text-rose-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Directory & Files Tree */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {tree.length === 0 ? (
          <div className="text-xs text-[#808080] p-4 text-center space-y-2">
            <p>No files in this folder.</p>
            <button
              onClick={onOpenFolder}
              className="px-2.5 py-1 bg-[#333333] hover:bg-[#3e3e42] text-sky-300 text-[11px] rounded transition-colors"
            >
              Open Another Folder
            </button>
          </div>
        ) : (
          tree.map((item) => (
            <TreeItem
              key={item.path}
              item={item}
              activeFilePath={activeFilePath}
              onOpenFile={onOpenFile}
              onDelete={onDeleteFile}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
            />
          ))
        )}
      </div>
    </div>
  );
}
