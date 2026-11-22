import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { LanguageInputSchema, TONE_OPTIONS } from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

export const SetProfileInputSchema = z.object({
  sender_name: z.string().optional().describe("Your full name used for {{sender_name}}"),
  role: z
    .string()
    .optional()
    .describe("Your role or title (e.g., 'CS Student & Freelance Web Developer')"),
  institution: z
    .string()
    .optional()
    .describe("Your university, company, or studio name"),
  email_signature: z
    .string()
    .optional()
    .describe("Optional multi-line signature appended to rendered drafts"),
  default_tone: z
    .enum(TONE_OPTIONS)
    .optional()
    .describe("Default tone: formal, polite, friendly, concise, apologetic, or firm"),
  default_language: LanguageInputSchema.optional().describe(
    "Default language: English or Bangla",
  ),
});

export function executeSetProfile(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = SetProfileInputSchema.parse(rawArgs);
    const profile = db.setProfile(args);

    const summary = [
      `Profile updated successfully:`,
      `- Name: ${profile.sender_name || "(not set)"}`,
      `- Role: ${profile.role || "(not set)"}`,
      `- Institution: ${profile.institution || "(not set)"}`,
      `- Default Tone: ${profile.default_tone}`,
      `- Default Language: ${profile.default_language}`,
      `- Signature: ${profile.email_signature || "(none)"}`,
    ].join("\n");

    return toolSuccess(summary, { profile });
  } catch (error) {
    return toolError(error);
  }
}

export function registerSetProfileTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "set_profile",
    "Configure the sender profile (sender_name, role, institution, email_signature, default_tone, default_language) used globally across templates.",
    SetProfileInputSchema.shape,
    async (args) => executeSetProfile(db, args),
  );
}
