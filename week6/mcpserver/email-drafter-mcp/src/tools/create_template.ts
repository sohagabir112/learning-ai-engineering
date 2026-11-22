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

export const CreateTemplateInputSchema = z.object({
  id: z
    .string()
    .min(1)
    .optional()
    .describe("Optional custom slug ID (auto-generated from name if omitted)"),
  name: z.string().min(2).describe("Human-readable template name"),
  category: z
    .enum(TEMPLATE_CATEGORIES)
    .describe("Template category: teacher, client, teammate, or general"),
  audience: z
    .enum(TEMPLATE_AUDIENCES)
    .describe("Target audience: teacher, client, teammate, general, or other"),
  language: LanguageInputSchema.optional().describe("Template language: English or Bangla"),
  subject: z.string().min(1).describe("Email subject line (may include {{placeholders}})"),
  body: z.string().min(1).describe("Email body text with {{placeholders}}"),
  placeholders: z
    .array(TemplatePlaceholderSchema)
    .describe("List of all placeholders used in the subject and body"),
  tone: z
    .enum(TONE_OPTIONS)
    .optional()
    .describe("Default tone for the template"),
});

export function executeCreateTemplate(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = CreateTemplateInputSchema.parse(rawArgs);

    const validation = validateTemplatePlaceholders(args.subject, args.body, args.placeholders);
    if (!validation.valid) {
      return toolError(new Error(validation.error));
    }

    const created = db.createTemplate({
      id: args.id,
      name: args.name,
      category: args.category,
      audience: args.audience,
      language: args.language ?? "English",
      subject: args.subject,
      body: args.body,
      placeholders: args.placeholders,
      tone: args.tone ?? "polite",
    });

    return toolSuccess(
      `Successfully created custom template "${created.name}" with ID "${created.id}".`,
      { template: created },
    );
  } catch (error) {
    return toolError(error);
  }
}

export function registerCreateTemplateTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "create_template",
    "Create and save a new reusable custom email template to SQLite after validating that all {{placeholders}} in the subject and body are declared.",
    CreateTemplateInputSchema.shape,
    async (args) => executeCreateTemplate(db, args),
  );
}
