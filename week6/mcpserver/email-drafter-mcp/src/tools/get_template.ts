import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { toolError, toolSuccess } from "./helpers.js";

export const GetTemplateInputSchema = z.object({
  id: z.string().min(1).describe("The unique slug ID of the template (e.g., 'teacher-extension-request')"),
});

export function executeGetTemplate(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = GetTemplateInputSchema.parse(rawArgs);
    const template = db.getTemplate(args.id);

    if (!template) {
      return toolError(new Error(`Template with id "${args.id}" was not found.`));
    }

    const formatted = [
      `Template: ${template.name} (${template.id})`,
      `Category: ${template.category} | Audience: ${template.audience} | Language: ${template.language} | Default Tone: ${template.tone}`,
      `Built-in: ${template.is_builtin ? "Yes" : "No"}`,
      `Subject: ${template.subject}`,
      `Placeholders:`,
      ...template.placeholders.map(
        (p) =>
          `  - {{${p.name}}} (${p.required ? "required" : `optional, default: "${p.default ?? ""}"`}): ${p.description}`,
      ),
      `\nBody:\n${template.body}`,
    ].join("\n");

    return toolSuccess(formatted, { template });
  } catch (error) {
    return toolError(error);
  }
}

export function registerGetTemplateTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "get_template",
    "Retrieve the full details, subject, body, and placeholder specifications of a template by its ID.",
    GetTemplateInputSchema.shape,
    async (args) => executeGetTemplate(db, args),
  );
}
