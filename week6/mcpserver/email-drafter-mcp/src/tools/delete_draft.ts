import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { toolError, toolSuccess } from "./helpers.js";

export const DeleteDraftInputSchema = z.object({
  id: z.number().int().positive().describe("Numeric ID of the draft to delete"),
});

export function executeDeleteDraft(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = DeleteDraftInputSchema.parse(rawArgs);
    const deleted = db.deleteDraft(args.id);

    return toolSuccess(`Deleted draft #${args.id}.`, {
      deleted,
      id: args.id,
    });
  } catch (error) {
    return toolError(error);
  }
}

export function registerDeleteDraftTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "delete_draft",
    "Delete a saved email draft by its numeric ID.",
    DeleteDraftInputSchema.shape,
    async (args) => executeDeleteDraft(db, args),
  );
}
