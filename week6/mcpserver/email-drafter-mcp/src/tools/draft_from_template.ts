import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { BANGLA_VARIANT_MAP } from "../templates/builtin.js";
import { renderTemplate } from "../templates/engine.js";
import { LanguageInputSchema, TONE_OPTIONS } from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

export const DraftFromTemplateInputSchema = z.object({
  template_id: z.string().min(1).describe("Template slug ID to render"),
  values: z
    .record(z.string(), z.string())
    .default({})
    .describe("Key-value map of placeholder names and their values"),
  tone: z
    .enum(TONE_OPTIONS)
    .optional()
    .describe("Optional tone override: formal, polite, friendly, concise, apologetic, or firm"),
  language: LanguageInputSchema.optional().describe(
    "Optional language preference: English or Bangla",
  ),
  contact_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional contact ID to auto-fill recipient_name and preferred_tone"),
  contact_name: z
    .string()
    .min(1)
    .optional()
    .describe("Optional contact name lookup to auto-fill recipient_name and preferred_tone"),
});

export function executeDraftFromTemplate(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = DraftFromTemplateInputSchema.parse(rawArgs);
    const profile = db.getProfile();

    const targetLanguage = args.language ?? profile.default_language;

    // Resolve Bangla variant automatically if Bangla is requested for a mapped English template
    let resolvedTemplateId = args.template_id;
    if (targetLanguage === "Bangla" && BANGLA_VARIANT_MAP[args.template_id]) {
      resolvedTemplateId = BANGLA_VARIANT_MAP[args.template_id] ?? args.template_id;
    }

    const template = db.getTemplate(resolvedTemplateId);
    if (!template) {
      return toolError(new Error(`Template "${args.template_id}" not found.`));
    }

    // Check if a contact was supplied by ID or name
    const contact =
      args.contact_id !== undefined
        ? db.getContact({ id: args.contact_id })
        : args.contact_name
          ? db.getContact({ name: args.contact_name })
          : undefined;

    if ((args.contact_id !== undefined || args.contact_name !== undefined) && !contact) {
      return toolError(
        new Error(
          `Contact ${args.contact_id !== undefined ? `with id ${args.contact_id}` : `"${args.contact_name}"`} not found.`,
        ),
      );
    }

    const mergedValues: Record<string, string | undefined> = { ...args.values };
    if (contact) {
      if (!mergedValues.recipient_name) {
        mergedValues.recipient_name = contact.name;
      }
      if (!mergedValues.organization_name && contact.organization) {
        mergedValues.organization_name = contact.organization;
      }
      if (!mergedValues.target_company && contact.organization) {
        mergedValues.target_company = contact.organization;
      }
    }

    const effectiveTone = args.tone ?? contact?.preferred_tone ?? template.tone;

    const rendered = renderTemplate(template, mergedValues, {
      profile,
      tone: effectiveTone,
    });

    if (!rendered.ok) {
      return toolError(new Error(rendered.error ?? "Failed to render template."));
    }

    const formattedText = `Subject: ${rendered.subject}\n\n${rendered.body}`;
    return toolSuccess(formattedText, {
      template_id: template.id,
      tone: effectiveTone,
      language: template.language,
      subject: rendered.subject,
      body: rendered.body,
      used_contact: contact ? { id: contact.id, name: contact.name, email: contact.email } : null,
    });
  } catch (error) {
    return toolError(error);
  }
}

export function registerDraftFromTemplateTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "draft_from_template",
    "Render a ready-to-send email or message from a template ID using placeholder values, optional tone/language overrides, and optional contact auto-fill.",
    DraftFromTemplateInputSchema.shape,
    async (args) => executeDraftFromTemplate(db, args),
  );
}
