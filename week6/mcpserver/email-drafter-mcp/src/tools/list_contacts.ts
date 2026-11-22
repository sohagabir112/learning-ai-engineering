import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { CONTACT_TYPES } from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

export const ListContactsInputSchema = z.object({
  type: z
    .enum(CONTACT_TYPES)
    .optional()
    .describe("Filter contacts by type: teacher, client, or teammate"),
  search: z
    .string()
    .optional()
    .describe("Optional search query matching name, email, or organization"),
});

export function executeListContacts(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = ListContactsInputSchema.parse(rawArgs ?? {});
    const contacts = db.listContacts(args);

    if (contacts.length === 0) {
      return toolSuccess("No contacts found matching the criteria.", {
        count: 0,
        contacts: [],
      });
    }

    const lines = contacts.map(
      (c) =>
        `- #${c.id}: ${c.name} [${c.type}]${c.email ? ` <${c.email}>` : ""}${
          c.organization ? ` (${c.organization})` : ""
        } | preferred_tone: ${c.preferred_tone}`,
    );

    return toolSuccess(`Found ${contacts.length} contact(s):\n\n${lines.join("\n")}`, {
      count: contacts.length,
      contacts,
    });
  } catch (error) {
    return toolError(error);
  }
}

export function registerListContactsTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "list_contacts",
    "List saved contacts, optionally filtered by contact type (teacher, client, teammate) or search keyword.",
    ListContactsInputSchema.shape,
    async (args) => executeListContacts(db, args),
  );
}
