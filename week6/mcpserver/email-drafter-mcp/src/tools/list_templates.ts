import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import {
  LanguageInputSchema,
  TEMPLATE_AUDIENCES,
  TEMPLATE_CATEGORIES,
} from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

export const ListTemplatesInputSchema = z.object({
  category: z
    .enum(TEMPLATE_CATEGORIES)
    .optional()
    .describe("Filter templates by category: teacher, client, teammate, or general"),
  audience: z
    .enum(TEMPLATE_AUDIENCES)
    .optional()
    .describe("Filter templates by target audience"),
  language: LanguageInputSchema.optional().describe(
    "Filter templates by language: English or Bangla",
  ),
});

export function executeListTemplates(
  db: DatabaseManager,
  rawArgs: unknown,
) {
  try {
    const args = ListTemplatesInputSchema.parse(rawArgs ?? {});
    const templates = db.listTemplates({
      category: args.category,
      audience: args.audience,
      language: args.language,
    });

    const summaryLines = templates.map((t) => {
      const placeholderList = t.placeholders
        .map((p) => (p.required ? `${p.name}*` : p.name))
        .join(", ");
      return `- ${t.id} (${t.name}) [${t.category}/${t.language}] | placeholders: ${placeholderList}`;
    });

    const text =
      templates.length === 0
        ? "No templates matched the provided filters."
        : `Found ${templates.length} template(s) (* indicates required placeholder):\n\n${summaryLines.join("\n")}`;

    return toolSuccess(text, {
      count: templates.length,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        audience: t.audience,
        language: t.language,
        placeholders: t.placeholders,
      })),
    });
  } catch (error) {
    return toolError(error);
  }
}

export function registerListTemplatesTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "list_templates",
    "List available email and message templates, optionally filtered by category (teacher, client, teammate, general), audience, or language (English, Bangla).",
    ListTemplatesInputSchema.shape,
    async (args) => executeListTemplates(db, args),
  );
}
