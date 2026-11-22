import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { DRAFT_STATUSES } from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

export const SaveDraftInputSchema = z.object({
  title: z.string().min(1).describe("Short descriptive title for the saved draft"),
  recipient: z.string().min(1).describe("Recipient name or email address"),
  subject: z.string().min(1).describe("Email subject line"),
  body: z.string().min(1).describe("Full email body text"),
  status: z
    .enum(DRAFT_STATUSES)
    .default("draft")
    .describe("Draft status: draft, ready, or sent"),
});

export function executeSaveDraft(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = SaveDraftInputSchema.parse(rawArgs);
    const saved = db.saveDraft(args);

    return toolSuccess(
      `Saved draft #${saved.id} ("${saved.title}") for ${saved.recipient} [status: ${saved.status}].`,
      { draft: saved },
    );
  } catch (error) {
    return toolError(error);
  }
}

export function registerSaveDraftTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "save_draft",
    "Save an email draft to SQLite with a title, recipient, subject, body, and status (draft, ready, or sent).",
    SaveDraftInputSchema.shape,
    async (args) => executeSaveDraft(db, args),
  );
}
