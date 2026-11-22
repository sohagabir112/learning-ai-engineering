import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { toolError, toolSuccess } from "./helpers.js";

export const GetContactInputSchema = z
  .object({
    id: z.number().int().positive().optional().describe("Contact numeric ID"),
    name: z.string().min(1).optional().describe("Contact name to search for"),
    email: z.string().min(1).optional().describe("Contact email address"),
  })
  .refine((data) => data.id !== undefined || Boolean(data.name) || Boolean(data.email), {
    message: "Please provide at least one of: id, name, or email.",
  });

export function executeGetContact(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = GetContactInputSchema.parse(rawArgs);
    const contact = db.getContact(args);

    if (!contact) {
      return toolError(new Error("Contact not found."));
    }

    const formatted = [
      `Contact #${contact.id}: ${contact.name}`,
      `Type: ${contact.type} | Preferred Tone: ${contact.preferred_tone}`,
      `Email: ${contact.email || "(none)"}`,
      `Organization: ${contact.organization || "(none)"}`,
      `Notes: ${contact.notes || "(none)"}`,
    ].join("\n");

    return toolSuccess(formatted, { contact });
  } catch (error) {
    return toolError(error);
  }
}

export function registerGetContactTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "get_contact",
    "Retrieve a contact's details and preferred tone by ID, name, or email.",
    {
      id: z.number().int().positive().optional().describe("Contact numeric ID"),
      name: z.string().min(1).optional().describe("Contact name to search for"),
      email: z.string().min(1).optional().describe("Contact email address"),
    },
    async (args) => executeGetContact(db, args),
  );
}
