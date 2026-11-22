import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { toolError, toolSuccess } from "./helpers.js";

export const DeleteTemplateInputSchema = z.object({
  id: z.string().min(1).describe("ID of the user-created template to delete"),
});

export function executeDeleteTemplate(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = DeleteTemplateInputSchema.parse(rawArgs);
    const deleted = db.deleteTemplate(args.id);

    return toolSuccess(`Deleted custom template "${args.id}".`, {
      deleted,
      id: args.id,
    });
  } catch (error) {
    return toolError(error);
  }
}

export function registerDeleteTemplateTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "delete_template",
    "Delete a user-created template by ID (built-in templates are protected and cannot be deleted).",
    DeleteTemplateInputSchema.shape,
    async (args) => executeDeleteTemplate(db, args),
  );
}
