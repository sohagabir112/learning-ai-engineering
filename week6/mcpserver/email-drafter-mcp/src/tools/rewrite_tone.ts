import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rewriteTone } from "../templates/engine.js";
import { LanguageInputSchema, TONE_OPTIONS } from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

export const RewriteToneInputSchema = z.object({
  text: z.string().min(1).describe("The email or message text to adjust"),
  target_tone: z
    .enum(TONE_OPTIONS)
    .describe("Target tone: formal, polite, friendly, concise, apologetic, or firm"),
  language: LanguageInputSchema.optional().describe(
    "Language of the text: English (default) or Bangla",
  ),
});

export function executeRewriteTone(rawArgs: unknown) {
  try {
    const args = RewriteToneInputSchema.parse(rawArgs);
    const result = rewriteTone(args.text, args.target_tone, args.language ?? "English");

    const formatted = [
      `### Rewritten Text (${result.target_tone} tone)`,
      ``,
      result.rewritten_text,
      ``,
      `---`,
      `**Applied Rule-Based Adjustments:** ${result.applied_adjustments.join("; ")}`,
      `**Model Guidance for Further Polishing:** ${result.model_guidance}`,
    ].join("\n");

    return toolSuccess(formatted, { ...result });
  } catch (error) {
    return toolError(error);
  }
}

export function registerRewriteToneTool(server: McpServer): void {
  server.tool(
    "rewrite_tone",
    "Adjust an email's greeting, phrasing, and sign-off to match a target tone (formal, polite, friendly, concise, apologetic, firm) and provide stylistic guidance.",
    RewriteToneInputSchema.shape,
    async (args) => executeRewriteTone(args),
  );
}
