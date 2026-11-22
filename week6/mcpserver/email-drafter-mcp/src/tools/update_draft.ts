import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { DRAFT_STATUSES } from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

export const UpdateDraftInputSchema = z.object({
  id: z.number().int().positive().describe("Numeric ID of the draft to update"),
  title: z.string().min(1).optional().describe("Updated title"),
  recipient: z.string().min(1).optional().describe("Updated recipient"),
  subject: z.string().min(1).optional().describe("Updated subject line"),
  body: z.string().min(1).optional().describe("Updated email body"),
  status: z.enum(DRAFT_STATUSES).optional().describe("Updated status: draft, ready, or sent"),
});

export function executeUpdateDraft(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = UpdateDraftInputSchema.parse(rawArgs);
    const updated = db.updateDraft(args.id, {
      title: args.title,
      recipient: args.recipient,
      subject: args.subject,
      body: args.body,
      status: args.status,
    });

    return toolSuccess(
      `Updated draft #${updated.id} ("${updated.title}") [status: ${updated.status}].`,
      { draft: updated },
    );
  } catch (error) {
    return toolError(error);
  }
}

export function registerUpdateDraftTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "update_draft",
    "Update the title, recipient, subject, body, or status of an existing draft.",
    UpdateDraftInputSchema.shape,
    async (args) => executeUpdateDraft(db, args),
  );
}
