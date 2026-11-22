import { z } from "zod";

export const TEMPLATE_CATEGORIES = ["teacher", "client", "teammate", "general"] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_AUDIENCES = ["teacher", "client", "teammate", "general", "other"] as const;
export type TemplateAudience = (typeof TEMPLATE_AUDIENCES)[number];

export const TONE_OPTIONS = [
  "formal",
  "polite",
  "friendly",
  "concise",
  "apologetic",
  "firm",
] as const;
export type ToneOption = (typeof TONE_OPTIONS)[number];

export const SUPPORTED_LANGUAGES = ["English", "Bangla"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DRAFT_STATUSES = ["draft", "ready", "sent"] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const CONTACT_TYPES = ["teacher", "client", "teammate"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const DRAFT_LENGTHS = ["short", "medium", "long"] as const;
export type DraftLength = (typeof DRAFT_LENGTHS)[number];

export const REPLY_INTENTS = ["accept", "decline", "ask more", "postpone"] as const;
export type ReplyIntent = (typeof REPLY_INTENTS)[number];

export const TemplatePlaceholderSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_]+$/, "Placeholder name must be alphanumeric with underscores"),
  description: z.string().min(1),
  required: z.boolean(),
  default: z.string().optional(),
});

export type TemplatePlaceholder = z.infer<typeof TemplatePlaceholderSchema>;

export interface EmailTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  audience: TemplateAudience;
  language: SupportedLanguage;
  subject: string;
  body: string;
  placeholders: TemplatePlaceholder[];
  tone: ToneOption;
  is_builtin: boolean;
  created_at: string;
}

export interface EmailTemplateSummary {
  id: string;
  name: string;
  category: TemplateCategory;
  audience: TemplateAudience;
  language: SupportedLanguage;
  tone: ToneOption;
  is_builtin: boolean;
  placeholders: TemplatePlaceholder[];
}

export interface EmailDraft {
  id: number;
  title: string;
  recipient: string;
  subject: string;
  body: string;
  status: DraftStatus;
  created_at: string;
  updated_at: string;
}

export interface SenderProfile {
  sender_name: string;
  role: string;
  institution: string;
  email_signature: string;
  default_tone: ToneOption;
  default_language: SupportedLanguage;
  updated_at: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  type: ContactType;
  organization: string;
  notes: string;
  preferred_tone: ToneOption;
  created_at: string;
  updated_at: string;
}

export type ProofreadCheckName =
  | "missing_subject"
  | "missing_greeting"
  | "missing_sign_off"
  | "overly_long_sentences"
  | "unresolved_placeholders"
  | "passive_heavy_phrasing"
  | "spelling_flags";

export interface ProofreadIssue {
  check: ProofreadCheckName;
  passed: boolean;
  details: string;
  suggestions: string[];
}

export interface ProofreadResult {
  passed_all: boolean;
  score: number;
  checklist: ProofreadIssue[];
  summary: string;
}

export interface RenderResult {
  ok: boolean;
  subject: string;
  body: string;
  missing_required: string[];
  used_values: Record<string, string>;
  error?: string;
}

export function normalizeLanguage(input?: string): SupportedLanguage | undefined {
  if (!input) {
    return undefined;
  }
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "english" || trimmed === "en") {
    return "English";
  }
  if (trimmed === "bangla" || trimmed === "bengali" || trimmed === "bn" || trimmed === "বাংলা") {
    return "Bangla";
  }
  return undefined;
}

export const LanguageInputSchema = z
  .string()
  .transform((val, ctx) => {
    const normalized = normalizeLanguage(val);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unsupported language "${val}". Supported languages: English, Bangla.`,
      });
      return z.NEVER;
    }
    return normalized;
  });
