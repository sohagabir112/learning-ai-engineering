import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { CONTACT_TYPES, TONE_OPTIONS } from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

export const AddContactInputSchema = z.object({
  name: z.string().min(1).describe("Contact's full name or title (e.g., 'Professor Rahman')"),
  email: z.string().email().optional().or(z.literal("")).describe("Contact's email address"),
  type: z.enum(CONTACT_TYPES).describe("Contact type: teacher, client, or teammate"),
  organization: z
    .string()
    .optional()
    .describe("Department, university, or client company name"),
  notes: z.string().optional().describe("Helpful context or notes about this contact"),
  preferred_tone: z
    .enum(TONE_OPTIONS)
    .default("polite")
    .describe("Preferred tone when drafting messages to this contact"),
});

export function executeAddContact(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = AddContactInputSchema.parse(rawArgs);
    const contact = db.addContact({
      name: args.name,
      email: args.email ?? "",
      type: args.type,
      organization: args.organization ?? "",
      notes: args.notes ?? "",
      preferred_tone: args.preferred_tone,
    });

    return toolSuccess(
      `Added contact #${contact.id}: ${contact.name} (${contact.type}, preferred tone: ${contact.preferred_tone}).`,
      { contact },
    );
  } catch (error) {
    return toolError(error);
  }
}

export function registerAddContactTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "add_contact",
    "Add a teacher, client, or teammate contact with their organization, notes, and preferred tone for automatic personalization.",
    AddContactInputSchema.shape,
    async (args) => executeAddContact(db, args),
  );
}
