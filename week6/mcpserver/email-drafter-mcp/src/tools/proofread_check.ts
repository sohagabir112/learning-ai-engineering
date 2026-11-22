import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { proofreadText } from "../templates/engine.js";
import { toolError, toolSuccess } from "./helpers.js";

export const ProofreadCheckInputSchema = z.object({
  text: z
    .string()
    .min(1)
    .describe("The full email text (optionally starting with 'Subject: ...') to proofread"),
  subject: z
    .string()
    .optional()
    .describe("Optional separate subject line if not included inside text"),
});

export function executeProofreadCheck(rawArgs: unknown) {
  try {
    const args = ProofreadCheckInputSchema.parse(rawArgs);
    const result = proofreadText(args.text, args.subject);

    const lines = [
      `### Proofread Report — Score: ${result.score}/100 (${result.passed_all ? "PASSED" : "NEEDS ATTENTION"})`,
      result.summary,
      ``,
      ...result.checklist.map((item) => {
        const icon = item.passed ? "[PASS]" : "[WARN]";
        const suggestionLine =
          item.suggestions.length > 0 ? `\n  Suggestion: ${item.suggestions.join(" ")}` : "";
        return `${icon} **${item.check}**: ${item.details}${suggestionLine}`;
      }),
    ];

    return toolSuccess(lines.join("\n"), { ...result });
  } catch (error) {
    return toolError(error);
  }
}

export function registerProofreadCheckTool(server: McpServer): void {
  server.tool(
    "proofread_check",
    "Run a 7-point quality checklist on an email draft (missing subject, missing greeting, missing sign-off, overly long sentences, unresolved {{placeholders}}, passive-heavy phrasing, and common spelling flags).",
    ProofreadCheckInputSchema.shape,
    async (args) => executeProofreadCheck(args),
  );
}
