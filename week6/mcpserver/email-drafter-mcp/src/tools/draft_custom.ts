import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DatabaseManager } from "../db.js";
import { DRAFT_LENGTHS, TONE_OPTIONS } from "../types.js";
import { toolError, toolSuccess } from "./helpers.js";

const RECIPIENT_TYPES = ["teacher", "client", "teammate", "other"] as const;

export const DraftCustomInputSchema = z.object({
  purpose: z.string().min(3).describe("The main goal or purpose of the email/message"),
  recipient_type: z
    .enum(RECIPIENT_TYPES)
    .describe("Recipient category: teacher, client, teammate, or other"),
  key_points: z
    .array(z.string().min(1))
    .min(1)
    .describe("Bullet points or facts that must be included in the message"),
  tone: z
    .enum(TONE_OPTIONS)
    .default("polite")
    .describe("Desired tone: formal, polite, friendly, concise, apologetic, or firm"),
  length: z
    .enum(DRAFT_LENGTHS)
    .default("medium")
    .describe("Target length: short (3-5 sentences), medium (2-3 paragraphs), or long (detailed)"),
});

const LENGTH_CONSTRAINTS: Record<(typeof DRAFT_LENGTHS)[number], string> = {
  short: "Keep under 90 words (1 short paragraph, 3-5 crisp sentences).",
  medium: "Aim for 120-200 words (2-3 well-structured paragraphs with optional bullet points).",
  long: "Aim for 220-350 words (thorough context, itemized breakdown, and clear call-to-action).",
};

const AUDIENCE_CONVENTIONS: Record<(typeof RECIPIENT_TYPES)[number], { salutation: string; closing: string; styleNote: string }> = {
  teacher: {
    salutation: "Dear Professor [Last Name],",
    closing: "Respectfully / Best regards,",
    styleNote:
      "Reference the course name/code early, show respect for academic policies, and state your specific request clearly.",
  },
  client: {
    salutation: "Dear [Client Name],",
    closing: "Best regards,",
    styleNote:
      "Focus on business value, deliverables, milestones, and clear next actions or approvals.",
  },
  teammate: {
    salutation: "Hi [Name / Team],",
    closing: "Best / Thanks,",
    styleNote:
      "Be collaborative and direct; highlight blockers, PR/ticket links, and dependencies clearly.",
  },
  other: {
    salutation: "Dear [Recipient Name],",
    closing: "Best regards,",
    styleNote: "Provide clear context in the opening line and end with a concrete call to action.",
  },
};

export function executeDraftCustom(db: DatabaseManager, rawArgs: unknown) {
  try {
    const args = DraftCustomInputSchema.parse(rawArgs);
    const profile = db.getProfile();
    const audienceGuide = AUDIENCE_CONVENTIONS[args.recipient_type];

    const subjectSuggestion = `${args.purpose.charAt(0).toUpperCase()}${args.purpose.slice(1)}${
      profile.sender_name ? ` - ${profile.sender_name}` : ""
    }`;

    const outline = [
      `1. Salutation: ${audienceGuide.salutation}`,
      `2. Opening Hook: State the purpose immediately ("${args.purpose}").`,
      `3. Core Body Points:`,
      ...args.key_points.map((pt, idx) => `   3.${idx + 1}. ${pt}`),
      `4. Call to Action / Next Step: Specify what confirmation, feedback, or action is needed.`,
      `5. Sign-Off: ${audienceGuide.closing} followed by ${profile.sender_name || "[Your Name]"}${
        profile.role ? ` (${profile.role})` : ""
      }.`,
    ];

    const constraints = [
      `Tone: ${args.tone}`,
      `Length: ${LENGTH_CONSTRAINTS[args.length]}`,
      `Audience Guidance (${args.recipient_type}): ${audienceGuide.styleNote}`,
      `Language: ${profile.default_language}`,
      "Do not leave unresolved {{placeholders}} in the final message.",
    ];

    const structuredBrief = {
      subject_suggestion: subjectSuggestion,
      recipient_type: args.recipient_type,
      tone: args.tone,
      length: args.length,
      sender: {
        name: profile.sender_name || "[Your Name]",
        role: profile.role,
        institution: profile.institution,
      },
      outline,
      constraints,
    };

    const textOutput = [
      `### Structured Drafting Brief`,
      `**Suggested Subject:** ${subjectSuggestion}`,
      `**Recipient Type:** ${args.recipient_type} | **Tone:** ${args.tone} | **Length:** ${args.length}`,
      ``,
      `#### Recommended Outline`,
      ...outline,
      ``,
      `#### Drafting Constraints`,
      ...constraints.map((c) => `- ${c}`),
    ].join("\n");

    return toolSuccess(textOutput, structuredBrief);
  } catch (error) {
    return toolError(error);
  }
}

export function registerDraftCustomTool(server: McpServer, db: DatabaseManager): void {
  server.tool(
    "draft_custom",
    "Generate a structured drafting brief (subject suggestion, section outline, and tone/length constraints) for custom emails that do not fit an existing template.",
    DraftCustomInputSchema.shape,
    async (args) => executeDraftCustom(db, args),
  );
}
