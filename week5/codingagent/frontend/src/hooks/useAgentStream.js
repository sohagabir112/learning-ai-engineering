import { useState, useRef, useCallback } from "react";
import {
  createSession,
  getStreamUrl,
  submitDecision,
  undoLastPatch,
} from "../api";

export function useAgentStream() {
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState("idle"); // "idle" | "thinking" | "waiting_for_review" | "error" | "done"
  const [statusText, setStatusText] = useState("");
  const [messages, setMessages] = useState([]);
  const [toolCalls, setToolCalls] = useState([]);
  const [pendingPatch, setPendingPatch] = useState(null);
  const [appliedPatch, setAppliedPatch] = useState(null);
  const [error, setError] = useState(null);

  const eventSourceRef = useRef(null);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const startAgent = useCallback(
    async (bugDescription, openFile = null, cursorLine = null) => {
      stopStream();
      setError(null);
      setMessages([]);
      setToolCalls([]);
      setPendingPatch(null);
      setAppliedPatch(null);
      setStatus("thinking");
      setStatusText("Starting bug analysis...");

      try {
        const { id } = await createSession(bugDescription, openFile, cursorLine);
        setSessionId(id);

        const sse = new EventSource(getStreamUrl(id));
        eventSourceRef.current = sse;

        sse.addEventListener("status", (e) => {
          try {
            const data = JSON.parse(e.data);
            setStatusText(data.message || "Working...");
            if (data.waiting_decision) {
              setStatus("waiting_for_review");
            }
          } catch {
            // ignore
          }
        });

        sse.addEventListener("message", (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.content) {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now() + Math.random(),
                  role: "assistant",
                  content: data.content,
                  timestamp: new Date().toLocaleTimeString(),
                },
              ]);
            }
          } catch {
            // ignore
          }
        });

        sse.addEventListener("tool_call", (e) => {
          try {
            const data = JSON.parse(e.data);
            setToolCalls((prev) => [
              ...prev,
              {
                id: data.id || Date.now() + Math.random(),
                name: data.name,
                arguments: data.arguments,
                status: "running",
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          } catch {
            // ignore
          }
        });

        sse.addEventListener("tool_result", (e) => {
          try {
            const data = JSON.parse(e.data);
            setToolCalls((prev) =>
              prev.map((tc) =>
                tc.name === data.name && tc.status === "running"
                  ? { ...tc, result: data.result, status: "completed" }
                  : tc
              )
            );
          } catch {
            // ignore
          }
        });

        sse.addEventListener("patch", (e) => {
          try {
            const patchData = JSON.parse(e.data);
            setPendingPatch(patchData);
            setStatus("waiting_for_review");
            setStatusText("Proposed fix ready for review.");
          } catch (err) {
            console.error("Failed to parse proposed patch:", err);
          }
        });

        sse.addEventListener("applied", (e) => {
          try {
            const data = JSON.parse(e.data);
            setAppliedPatch(data);
            setPendingPatch(null);
            setStatus("thinking");
            setStatusText(`Fix applied to ${data.path}`);
          } catch {
            // ignore
          }
        });

        sse.addEventListener("rejected", (e) => {
          try {
            const data = JSON.parse(e.data);
            setPendingPatch(null);
            setStatus("thinking");
            setStatusText("Patch rejected. Agent is analyzing next steps...");
          } catch {
            // ignore
          }
        });

        sse.addEventListener("error", (e) => {
          try {
            const data = JSON.parse(e.data);
            setError(data.message || "An agent error occurred.");
            setStatus("error");
          } catch {
            setError("Connection error with agent server.");
            setStatus("error");
          }
        });

        sse.addEventListener("done", () => {
          setStatus((current) =>
            current === "waiting_for_review" ? current : "idle"
          );
          setStatusText("Ready");
          stopStream();
        });

        sse.onerror = () => {
          // EventSource will auto-reconnect or fail if server down
          if (sse.readyState === EventSource.CLOSED) {
            setStatus((current) =>
              current === "waiting_for_review" ? current : "idle"
            );
          }
        };
      } catch (err) {
        setError(err.message || "Could not start agent session.");
        setStatus("error");
        setStatusText("Error");
        stopStream();
      }
    },
    [stopStream]
  );

  const acceptFix = useCallback(async () => {
    if (!sessionId || !pendingPatch) return;
    try {
      setStatusText("Applying fix...");
      await submitDecision(sessionId, "accept");
    } catch (err) {
      setError(err.message || "Failed to accept fix.");
    }
  }, [sessionId, pendingPatch]);

  const rejectFix = useCallback(
    async (reason = "") => {
      if (!sessionId || !pendingPatch) return;
      try {
        setStatusText("Rejecting fix...");
        await submitDecision(sessionId, "reject", reason);
        setPendingPatch(null);
      } catch (err) {
        setError(err.message || "Failed to reject fix.");
      }
    },
    [sessionId, pendingPatch]
  );

  const undo = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await undoLastPatch(sessionId);
      setAppliedPatch(null);
      setStatusText("Last fix restored from backup.");
      return res;
    } catch (err) {
      setError(err.message || "Failed to undo patch.");
    }
  }, [sessionId]);

  const clearSession = useCallback(() => {
    stopStream();
    setSessionId(null);
    setStatus("idle");
    setStatusText("");
    setMessages([]);
    setToolCalls([]);
    setPendingPatch(null);
    setAppliedPatch(null);
    setError(null);
  }, [stopStream]);

  return {
    sessionId,
    status,
    statusText,
    messages,
    toolCalls,
    pendingPatch,
    appliedPatch,
    error,
    startAgent,
    acceptFix,
    rejectFix,
    undo,
    clearSession,
  };
}
