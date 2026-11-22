import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { REPLY_INTENTS, TONE_OPTIONS } from "./types.js";

export function registerAllPrompts(server: McpServer): void {
  // 1. write_email
  server.prompt(
    "write_email",
    "Guide the assistant to select a matching built-in/custom template or fall back to draft_custom to write a complete email.",
    {
      recipient_type: z
        .enum(["teacher", "client", "teammate", "general", "other"])
        .describe("Who the email is for (teacher, client, teammate, general, or other)"),
      purpose: z.string().min(1).describe("Goal of the email (e.g., extension request, delay notice)"),
      tone: z
        .enum(TONE_OPTIONS)
        .optional()
        .describe("Desired tone (formal, polite, friendly, concise, apologetic, firm)"),
    },
    ({ recipient_type, purpose, tone }) => {
      const selectedTone = tone ?? "polite";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                `I need to draft an email for a "${recipient_type}" with the purpose: "${purpose}" using a "${selectedTone}" tone.`,
                ``,
                `Please follow these steps:`,
                `1. Call \`list_templates\` filtered by category="${recipient_type === "other" ? "general" : recipient_type}" to check if a built-in or custom template matches this purpose.`,
                `2. Check \`list_contacts\` to see if there is a saved contact matching the recipient.`,
                `3. If a suitable template exists, call \`draft_from_template\` with the appropriate placeholder values and tone="${selectedTone}".`,
                `4. If no template fits, call \`draft_custom\` with purpose="${purpose}", recipient_type="${recipient_type === "general" ? "other" : recipient_type}", tone="${selectedTone}", and write the complete ready-to-send email from the returned brief.`,
              ].join("\n"),
            },
          },
        ],
      };
    },
  );

  // 2. polish_email
  server.prompt(
    "polish_email",
    "Audit an existing email draft with proofread_check and refine its tone with rewrite_tone.",
    {
      text: z.string().min(1).describe("The email draft text to proofread and polish"),
      target_tone: z
        .enum(TONE_OPTIONS)
        .optional()
        .describe("Optional target tone for rewriting (defaults to polite)"),
    },
    ({ text, target_tone }) => {
      const tone = target_tone ?? "polite";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                `Please review and polish the following email draft:`,
                ``,
                `"""`,
                text,
                `"""`,
                ``,
                `Steps to execute:`,
                `1. Run \`proofread_check\` on the text and review all 7 checklist items (missing subject, greeting, sign-off, long sentences, unresolved placeholders, passive voice, and spelling flags).`,
                `2. Run \`rewrite_tone\` on the text with target_tone="${tone}".`,
                `3. Present the proofread findings briefly and provide the final polished, ready-to-send version.`,
              ].join("\n"),
            },
          },
        ],
      };
    },
  );

  // 3. reply_to_email
  server.prompt(
    "reply_to_email",
    "Draft a structured reply to an incoming email given your reply intent (accept, decline, ask more, postpone) and tone.",
    {
      original_email: z.string().min(1).describe("The incoming email text you are replying to"),
      intent: z
        .enum(REPLY_INTENTS)
        .describe("Reply intent: accept, decline, ask more, or postpone"),
      tone: z
        .enum(TONE_OPTIONS)
        .optional()
        .describe("Tone for the reply (formal, polite, friendly, concise, apologetic, firm)"),
    },
    ({ original_email, intent, tone }) => {
      const selectedTone = tone ?? "polite";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: [
                `I need to reply to the following email with the intent to "${intent}" in a "${selectedTone}" tone:`,
                ``,
                `"""`,
                original_email,
                `"""`,
                ``,
                `Please:`,
                `1. Call \`get_profile\` so you can sign off with my configured sender name and role.`,
                `2. Call \`draft_custom\` with purpose="Reply to email (${intent})", key_points summarizing the key response points addressing the original sender's questions, and tone="${selectedTone}".`,
                `3. Write the complete, ready-to-send reply email with an appropriate "Re: ..." subject line.`,
              ].join("\n"),
            },
          },
        ],
      };
    },
  );

  // 4. weekly_client_update
  server.prompt(
    "weekly_client_update",
    "Generate a polished weekly project status update email for a client.",
    {
      project_name: z.string().min(1).describe("Name of the client project"),
      done: z.string().min(1).describe("Completed items or milestones this week"),
      in_progress: z.string().min(1).describe("Items currently in progress"),
      blockers: z
        .string()
        .optional()
        .describe("Any blockers, decisions, or assets needed from the client"),
      recipient_name: z
        .string()
        .optional()
        .describe("Client's name (defaults to 'Client')"),
    },
    ({ project_name, done, in_progress, blockers, recipient_name }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Please draft a weekly client update email for project "${project_name}".`,
              ``,
              `Use the \`draft_from_template\` tool with template_id="client-project-update" and these values:`,
              `- recipient_name: "${recipient_name ?? "Client"}"`,
              `- project_name: "${project_name}"`,
              `- milestone_name: "Weekly Status Update"`,
              `- completed_items: "${done}"`,
              `- in_progress_items: "${in_progress}"`,
              `- next_steps: "${blockers ? `Blockers / Needed from you: ${blockers}` : "Continuing onto the next sprint tasks on schedule."}"`,
              ``,
              `Return the rendered subject and body ready to send.`,
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
