import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { DRAFT_STATUSES } from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

export const ListDraftsInputSchema = z.object({
  status: z
    .enum(DRAFT_STATUSES)
    .optional()
    .describe("Filter drafts by status: draft, ready, or sent"),
  recipient: z
    .string()
    .optional()
    .describe("Filter drafts by recipient name or email substring"),
  from_date: z
    .string()
    .optional()
    .describe("Optional ISO start date/timestamp filter (inclusive)"),
  to_date: z
    .string()
    .optional()
    .describe("Optional ISO end date/timestamp filter (inclusive)"),
});

export function executeListDrafts(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = ListDraftsInputSchema.parse(rawArgs ?? {});
    const drafts = db.listDrafts(args);

    if (drafts.length === 0) {
      return toolSuccess("No drafts found matching the filters.", {
        count: 0,
        drafts: [],
      });
    }

    const lines = drafts.map(
      (d) =>
        `- #${d.id}: "${d.title}" -> ${d.recipient} | Subject: "${d.subject}" | Status: ${d.status} | Created: ${d.created_at}`,
    );

    return toolSuccess(`Found ${drafts.length} draft(s):\n\n${lines.join("\n")}`, {
      count: drafts.length,
      drafts,
    });
  } catch (error) {
    return toolError(error);
  }
}

export function registerListDraftsTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "list_drafts",
    "List saved email drafts, optionally filtered by status (draft, ready, sent), recipient, or date range.",
    ListDraftsInputSchema.shape,
    async (args) => executeListDrafts(db, args),
  );
}
