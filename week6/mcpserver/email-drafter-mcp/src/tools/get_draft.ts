import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { toolError, toolSuccess } from "./helpers.js";

export const GetDraftInputSchema = z.object({
  id: z.number().int().positive().describe("Numeric ID of the saved draft"),
});

export function executeGetDraft(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = GetDraftInputSchema.parse(rawArgs);
    const draft = db.getDraft(args.id);

    if (!draft) {
      return toolError(new Error(`Draft with id ${args.id} not found.`));
    }

    const formatted = [
      `Draft #${draft.id}: ${draft.title}`,
      `Recipient: ${draft.recipient} | Status: ${draft.status}`,
      `Created: ${draft.created_at} | Updated: ${draft.updated_at}`,
      `Subject: ${draft.subject}`,
      ``,
      draft.body,
    ].join("\n");

    return toolSuccess(formatted, { draft });
  } catch (error) {
    return toolError(error);
  }
}

export function registerGetDraftTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "get_draft",
    "Retrieve a saved email draft by its numeric ID.",
    GetDraftInputSchema.shape,
    async (args) => executeGetDraft(db, args),
  );
}
