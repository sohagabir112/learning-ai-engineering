import React, { useState } from "react";
import {
  Search,
  FileText,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

export default function ToolLog({ tools = [] }) {
  const [expandedMap, setExpandedMap] = useState({});

  if (!tools || tools.length === 0) return null;

  const toggleExpand = (idx) => {
    setExpandedMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getToolTitle = (tool) => {
    const { name, arguments: args } = tool;
    if (name === "search_files") {
      return `Searching for "${args?.query || ""}"`;
    }
    if (name === "read_file") {
      const range =
        args?.start_line && args?.end_line
          ? ` lines ${args.start_line}-${args.end_line}`
          : "";
      return `Reading ${args?.path || "file"}${range}`;
    }
    if (name === "propose_fix") {
      return `Proposing fix for ${args?.path || "file"} (lines ${args?.start_line}-${args?.end_line})`;
    }
    return `Running ${name}`;
  };

  return (
    <div className="my-3 space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 px-1">
        Agent Activity ({tools.length})
      </div>

      <div className="space-y-1.5 font-mono text-xs">
        {tools.map((tool, index) => {
          const isExpanded = !!expandedMap[index];
          const isRunning = tool.status === "running";
          const isError = tool.status === "completed" && tool.result?.error;

          return (
            <div
              key={tool.id || index}
              className="rounded border border-[#333333] bg-[#252526] overflow-hidden"
            >
              <div
                onClick={() => toggleExpand(index)}
                className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-[#2d2d2d] transition-colors select-none"
              >
                <div className="flex items-center space-x-2 truncate pr-2">
                  <span className="text-neutral-400">
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </span>

                  {tool.name === "search_files" && (
                    <Search size={14} className="text-blue-400 flex-shrink-0" />
                  )}
                  {tool.name === "read_file" && (
                    <FileText
                      size={14}
                      className="text-amber-400 flex-shrink-0"
                    />
                  )}
                  {tool.name === "propose_fix" && (
                    <Wrench size={14} className="text-emerald-400 flex-shrink-0" />
                  )}

                  <span className="truncate text-[#cccccc] font-sans font-medium text-[12px]">
                    {getToolTitle(tool)}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {isRunning && (
                    <Loader2
                      size={13}
                      className="animate-spin text-sky-400"
                    />
                  )}
                  {!isRunning && !isError && (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  )}
                  {isError && (
                    <AlertCircle size={13} className="text-rose-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 py-2 border-t border-[#333333] bg-[#1e1e1e] text-[11px] text-[#a0a0a0] space-y-2 overflow-x-auto max-h-48 scrollbar-thin">
                  <div>
                    <span className="text-neutral-500 font-sans font-semibold">
                      Arguments:
                    </span>
                    <pre className="mt-0.5 text-sky-300 whitespace-pre-wrap font-mono">
                      {JSON.stringify(tool.arguments, null, 2)}
                    </pre>
                  </div>

                  {tool.result && (
                    <div>
                      <span className="text-neutral-500 font-sans font-semibold">
                        Result:
                      </span>
                      {tool.name === "search_files" && tool.result.matches ? (
                        <div className="mt-1 space-y-1 font-mono text-[11px]">
                          <div className="text-neutral-400">
                            Found {tool.result.matches.length} matches:
                          </div>
                          {tool.result.matches.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="pl-2 border-l border-[#404040] text-neutral-300"
                            >
                              <span className="text-yellow-400">{m.path}</span>
                              <span className="text-neutral-500">:{m.line}</span>{" "}
                              <span className="text-[#9cdcfe]">{m.snippet}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="mt-0.5 text-neutral-300 whitespace-pre-wrap font-mono">
                          {typeof tool.result === "string"
                            ? tool.result
                            : JSON.stringify(tool.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
