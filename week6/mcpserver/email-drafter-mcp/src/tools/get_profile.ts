import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { toolError, toolSuccess } from "./helpers.js";

export const GetProfileInputSchema = z.object({});

export function executeGetProfile(db: DatabaseManager) {
  try {
    const profile = db.getProfile();
    const summary = [
      `Sender Profile:`,
      `- Name: ${profile.sender_name || "(not set)"}`,
      `- Role: ${profile.role || "(not set)"}`,
      `- Institution: ${profile.institution || "(not set)"}`,
      `- Default Tone: ${profile.default_tone}`,
      `- Default Language: ${profile.default_language}`,
      `- Signature: ${profile.email_signature || "(none)"}`,
      `- Last Updated: ${profile.updated_at}`,
    ].join("\n");

    return toolSuccess(summary, { profile });
  } catch (error) {
    return toolError(error);
  }
}

export function registerGetProfileTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "get_profile",
    "Get the currently stored sender profile (name, role, institution, signature, default tone, and default language).",
    GetProfileInputSchema.shape,
    async () => executeGetProfile(db),
  );
}
