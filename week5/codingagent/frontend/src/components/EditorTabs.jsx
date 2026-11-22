import React from "react";
import { X, FileCode2, FileText } from "lucide-react";

function getTabIcon(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  switch (ext) {
    case "py":
      return <FileCode2 size={13} className="text-yellow-400 flex-shrink-0" />;
    case "js":
    case "jsx":
      return <FileCode2 size={13} className="text-amber-300 flex-shrink-0" />;
    case "ts":
    case "tsx":
      return <FileCode2 size={13} className="text-sky-400 flex-shrink-0" />;
    case "json":
      return <FileText size={13} className="text-yellow-500 flex-shrink-0" />;
    default:
      return <FileText size={13} className="text-neutral-400 flex-shrink-0" />;
  }
}

export default function EditorTabs({
  openTabs = [],
  activePath,
  dirtyMap = {},
  onSelectTab,
  onCloseTab,
}) {
  if (openTabs.length === 0) return null;

  return (
    <div className="flex items-center bg-[#252526] border-b border-[#1e1e1e] overflow-x-auto select-none scrollbar-none h-9">
      {openTabs.map((path) => {
        const isActive = activePath === path;
        const fileName = path.split("/").pop() || path;
        const isDirty = !!dirtyMap[path];

        return (
          <div
            key={path}
            onClick={() => onSelectTab(path)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                // Middle click closes tab
                e.preventDefault();
                onCloseTab(path);
              }
            }}
            title={path}
            className={`group relative flex items-center h-full px-3.5 space-x-2 text-xs border-r border-[#1e1e1e] cursor-pointer transition-colors flex-shrink-0 ${
              isActive
                ? "bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]"
                : "bg-[#2d2d2d] text-[#969696] hover:bg-[#282828] hover:text-[#cccccc]"
            }`}
          >
            {getTabIcon(fileName)}
            <span className="truncate max-w-[140px] font-sans">{fileName}</span>

            {/* Unsaved dirty dot or Close X icon */}
            <div className="flex items-center justify-center w-4 h-4 ml-1">
              {isDirty ? (
                <span
                  title="Unsaved changes"
                  className="w-2 h-2 rounded-full bg-blue-400 group-hover:hidden"
                />
              ) : null}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(path);
                }}
                className={`rounded hover:bg-[#333333] p-0.5 text-neutral-400 hover:text-white transition-opacity ${
                  isDirty ? "hidden group-hover:block" : "opacity-0 group-hover:opacity-100"
                } ${isActive ? "opacity-100" : ""}`}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
