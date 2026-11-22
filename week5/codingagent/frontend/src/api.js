const API_BASE = "http://127.0.0.1:8000";

/**
 * Retrieves the workspace root metadata.
 */
export async function fetchWorkspace() {
  const res = await fetch(`${API_BASE}/api/workspace`);
  if (!res.ok) throw new Error("Failed to load workspace info");
  return res.json();
}

/**
 * Changes the active workspace folder.
 */
export async function changeWorkspace(path) {
  const res = await fetch(`${API_BASE}/api/workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to switch workspace folder");
  }
  return res.json();
}

/**
 * Lists subfolders in a directory for folder browsing.
 */
export async function listFolders(path = "") {
  const res = await fetch(`${API_BASE}/api/folders?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to browse directories");
  }
  return res.json();
}

/**
 * Executes a code file (e.g. Python or JS) and captures output.
 */
export async function executeCode(path) {
  const res = await fetch(`${API_BASE}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to execute code");
  }
  return res.json();
}

/**
 * Retrieves directory tree for file explorer.
 */
export async function fetchTree(path = "") {
  const res = await fetch(`${API_BASE}/api/tree?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load directory tree");
  }
  return res.json();
}

/**
 * Retrieves the contents of a specific file.
 */
export async function fetchFile(path) {
  const res = await fetch(`${API_BASE}/api/file?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to read file");
  }
  return res.json();
}

/**
 * Saves edited contents to disk.
 */
export async function saveFile(path, content) {
  const res = await fetch(`${API_BASE}/api/file`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to save file");
  }
  return res.json();
}

/**
 * Creates a new file or directory.
 */
export async function createFile(path, isDirectory = false, content = "") {
  const res = await fetch(`${API_BASE}/api/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, is_directory: isDirectory, content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create file/folder");
  }
  return res.json();
}

/**
 * Deletes a file or directory.
 */
export async function deleteFile(path) {
  const res = await fetch(`${API_BASE}/api/file?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to delete file/folder");
  }
  return res.json();
}

/**
 * Searches the workspace for text occurrences.
 */
export async function searchWorkspace(query, fileGlob = null) {
  const url = new URL(`${API_BASE}/api/search`);
  url.searchParams.set("q", query);
  if (fileGlob) url.searchParams.set("file_glob", fileGlob);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

/**
 * Creates an agent bug-fixing session.
 */
export async function createSession(bug, openFile = null, cursorLine = null) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bug,
      open_file: openFile,
      cursor_line: cursorLine,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create agent session");
  }
  return res.json();
}

/**
 * Submits user decision on a proposed patch.
 */
export async function submitDecision(sessionId, decision, reason = "") {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit decision");
  }
  return res.json();
}

/**
 * Restores the .bak copy for the last applied patch.
 */
export async function undoLastPatch(sessionId) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/undo`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to undo patch");
  }
  return res.json();
}

/**
 * Returns the SSE stream URL for a session.
 */
export function getStreamUrl(sessionId) {
  return `${API_BASE}/api/sessions/${sessionId}/stream`;
}
