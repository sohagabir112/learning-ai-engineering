import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { validateTemplatePlaceholders } from "../templates/engine.js";
import {
  LanguageInputSchema,
  TEMPLATE_AUDIENCES,
  TEMPLATE_CATEGORIES,
  TemplatePlaceholderSchema,
  TONE_OPTIONS,
} from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

export const UpdateTemplateInputSchema = z.object({
  id: z.string().min(1).describe("ID of the user-created template to update"),
  name: z.string().min(2).optional().describe("Updated template name"),
  category: z.enum(TEMPLATE_CATEGORIES).optional().describe("Updated category"),
  audience: z.enum(TEMPLATE_AUDIENCES).optional().describe("Updated audience"),
  language: LanguageInputSchema.optional().describe("Updated language"),
  subject: z.string().min(1).optional().describe("Updated subject template"),
  body: z.string().min(1).optional().describe("Updated body template"),
  placeholders: z
    .array(TemplatePlaceholderSchema)
    .optional()
    .describe("Updated placeholder declarations"),
  tone: z.enum(TONE_OPTIONS).optional().describe("Updated default tone"),
});

export function executeUpdateTemplate(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = UpdateTemplateInputSchema.parse(rawArgs);
    const existing = db.getTemplate(args.id);

    if (!existing) {
      return toolError(new Error(`Template "${args.id}" not found.`));
    }
    if (existing.is_builtin) {
      return toolError(
        new Error(
          `Cannot update built-in template "${args.id}". Only user-created templates can be modified.`,
        ),
      );
    }

    const nextSubject = args.subject ?? existing.subject;
    const nextBody = args.body ?? existing.body;
    const nextPlaceholders = args.placeholders ?? existing.placeholders;

    const validation = validateTemplatePlaceholders(nextSubject, nextBody, nextPlaceholders);
    if (!validation.valid) {
      return toolError(new Error(validation.error));
    }

    const updated = db.updateTemplate(args.id, {
      name: args.name,
      category: args.category,
      audience: args.audience,
      language: args.language,
      subject: args.subject,
      body: args.body,
      placeholders: args.placeholders,
      tone: args.tone,
    });

    return toolSuccess(`Updated custom template "${updated.id}".`, { template: updated });
  } catch (error) {
    return toolError(error);
  }
}

export function registerUpdateTemplateTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "update_template",
    "Update an existing user-created template (built-in templates cannot be modified).",
    UpdateTemplateInputSchema.shape,
    async (args) => executeUpdateTemplate(db, args),
  );
}
