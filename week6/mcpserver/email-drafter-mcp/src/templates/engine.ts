import {
  EmailTemplate,
  ProofreadIssue,
  ProofreadResult,
  RenderResult,
  SenderProfile,
  SupportedLanguage,
  TemplatePlaceholder,
  ToneOption,
} from "../types.js";

const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function extractPlaceholders(text: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null = PLACEHOLDER_REGEX.exec(text);
  while (match !== null) {
    if (match[1]) {
      found.add(match[1]);
    }
    match = PLACEHOLDER_REGEX.exec(text);
  }
  PLACEHOLDER_REGEX.lastIndex = 0;
  return Array.from(found);
}

export interface PlaceholderValidationResult {
  valid: boolean;
  undeclared: string[];
  error?: string;
}

export function validateTemplatePlaceholders(
  subject: string,
  body: string,
  declaredPlaceholders: TemplatePlaceholder[],
): PlaceholderValidationResult {
  const declaredSet = new Set(declaredPlaceholders.map((p) => p.name));
  const usedInSubject = extractPlaceholders(subject);
  const usedInBody = extractPlaceholders(body);
  const allUsed = Array.from(new Set([...usedInSubject, ...usedInBody]));

  const undeclared = allUsed.filter((name) => !declaredSet.has(name));

  if (undeclared.length > 0) {
    return {
      valid: false,
      undeclared,
      error: `Undeclared placeholder(s) found in template: ${undeclared.map((u) => `{{${u}}}`).join(", ")}. Please declare all placeholders in the placeholders list.`,
    };
  }

  return {
    valid: true,
    undeclared: [],
  };
}

interface TonePreset {
  greetingPrefix: string;
  signOff: string;
  substitutions: Array<[RegExp, string]>;
  guidance: string;
}

const ENGLISH_TONE_PRESETS: Record<ToneOption, TonePreset> = {
  formal: {
    greetingPrefix: "Dear",
    signOff: "Sincerely,",
    substitutions: [
      [/\bI'm\b/g, "I am"],
      [/\bI'd\b/g, "I would"],
      [/\bI've\b/g, "I have"],
      [/\bI'll\b/g, "I will"],
      [/\bcan't\b/gi, "cannot"],
      [/\bwon't\b/gi, "will not"],
      [/\bdon't\b/gi, "do not"],
      [/\bdidn't\b/gi, "did not"],
      [/\blet's\b/gi, "let us"],
      [/\bThanks for\b/g, "Thank you for"],
      [/\bthanks for\b/g, "thank you for"],
      [/\bJust wanted to\b/g, "I am writing to"],
      [/\bI just wanted to\b/g, "I am writing to"],
      [/\blet me know\b/gi, "please inform me"],
      [/\bquick heads-up\b/gi, "formal notice"],
    ],
    guidance:
      "Use complete sentences, avoid contractions, address the recipient by title and last name, and maintain professional distance.",
  },
  polite: {
    greetingPrefix: "Dear",
    signOff: "Best regards,",
    substitutions: [
      [/\bI need you to\b/gi, "I would greatly appreciate it if you could"],
      [/\bSend me\b/g, "Could you please send me"],
      [/\bPlease send\b/g, "Could you kindly send"],
      [/\bLet me know\b/g, "Please let me know at your convenience"],
      [/\bI want to ask\b/gi, "I would like to kindly request"],
    ],
    guidance:
      "Show respect for the recipient's time, soften requests with 'kindly' or 'at your convenience', and express gratitude clearly.",
  },
  friendly: {
    greetingPrefix: "Hi",
    signOff: "Warmly,",
    substitutions: [
      [/\bI am writing to inform you that\b/gi, "I wanted to reach out and share that"],
      [/\bPlease be advised that\b/gi, "Just a quick heads-up that"],
      [/\bI would like to request\b/gi, "I'd love to ask for"],
      [/\bThank you for your attention to this matter\./gi, "Thanks so much for your help!"],
      [/\bThank you for your consideration\./gi, "Thanks so much for considering this!"],
    ],
    guidance:
      "Keep the tone warm, approachable, and conversational while staying respectful and clear about next steps.",
  },
  concise: {
    greetingPrefix: "Hello",
    signOff: "Best,",
    substitutions: [
      [/I hope this email finds you well\.\s*/gi, ""],
      [/I hope you are having a great week\.\s*/gi, ""],
      [/I hope you are doing well\.\s*/gi, ""],
      [/\bI am writing to let you know that\s+/gi, ""],
      [/\bI am reaching out to inform you that\s+/gi, ""],
      [/\bI just wanted to reach out and\s+/gi, ""],
      [/\bAt your earliest convenience,\s*please\b/gi, "Please"],
      [/\bThank you in advance for your time and consideration\./gi, "Thank you."],
    ],
    guidance:
      "Eliminate pleasantries and filler phrases, state the core request or update in the first sentence, and keep sentences brief.",
  },
  apologetic: {
    greetingPrefix: "Dear",
    signOff: "With sincere apologies,",
    substitutions: [
      [/\bUnfortunately,\b/g, "I sincerely apologize, as unfortunately,"],
      [/\bThere is a delay\b/gi, "I am truly sorry for the delay"],
      [/\bI will miss\b/gi, "I deeply regret that I must miss"],
      [
        /\bThank you for your patience\./gi,
        "Thank you very much for your patience and understanding regarding this inconvenience.",
      ],
      [
        /\bThank you for your understanding\./gi,
        "I sincerely appreciate your patience and understanding.",
      ],
    ],
    guidance:
      "Take clear ownership without over-explaining excuses, express genuine regret for any inconvenience, and provide a concrete remediation plan.",
  },
  firm: {
    greetingPrefix: "Dear",
    signOff: "Regards,",
    substitutions: [
      [/\bI was hoping we might be able to\b/gi, "We need to"],
      [/\bIf possible,\s*please\b/gi, "Please"],
      [/\bSorry to bother you,\s*but\s*/gi, ""],
      [/\bwhenever you get a chance\b/gi, "by the stated deadline"],
      [/\bI would appreciate it if you could\b/gi, "Please"],
      [/\bjust checking in on\b/gi, "following up on the required"],
    ],
    guidance:
      "State deadlines, expectations, and consequences directly without hedging or apologetic filler while remaining professional.",
  },
};

const BANGLA_TONE_PRESETS: Record<ToneOption, TonePreset> = {
  formal: {
    greetingPrefix: "শ্রদ্ধেয়",
    signOff: "বিনীত নিবেদক,",
    substitutions: [
      [/আশা করি ভালো আছেন।/g, "আশা করি আপনি কুশলে আছেন।"],
      [/ধন্যবাদ।/g, "আপনার সদয় বিবেচনার জন্য আন্তরিক ধন্যবাদ।"],
    ],
    guidance: "আনুষ্ঠানিক ও মার্জিত ভাষা ব্যবহার করুন এবং সম্বোধনে যথাযথ সম্মান প্রদর্শন করুন।",
  },
  polite: {
    greetingPrefix: "শ্রদ্ধেয়",
    signOff: "বিনীত,",
    substitutions: [[/দয়া করে জানান/g, "অনুগ্রহপূর্বক জানালে বাধিত হব"]],
    guidance: "বিনম্র ও সৌজন্যমূলক শব্দচয়ন ব্যবহার করুন।",
  },
  friendly: {
    greetingPrefix: "প্রিয়",
    signOff: "শুভেচ্ছান্তে,",
    substitutions: [[/বিনীত নিবেদন এই যে,/g, "আশা করি আপনি অনেক ভালো আছেন।"]],
    guidance: "আন্তরিক ও সহজবোধ্য ভাষা ব্যবহার করুন।",
  },
  concise: {
    greetingPrefix: "জনাব/মহোদয়",
    signOff: "ধন্যবাদান্তে,",
    substitutions: [
      [/আশা করি আপনি ভালো ও সুস্থ আছেন।\s*/g, ""],
      [/সবিনয় নিবেদন এই যে,\s*/g, ""],
    ],
    guidance: "অতিরিক্ত ভূমিকা বাদ দিয়ে সরাসরি মূল বক্তব্য সংক্ষেপে উপস্থাপন করুন।",
  },
  apologetic: {
    greetingPrefix: "শ্রদ্ধেয়",
    signOff: "ান্তরিক দুঃখ প্রকাশপূর্বক, বিনীত,",
    substitutions: [
      [/অসুবিধার জন্য দুঃখিত।/g, "এই অনাকাঙ্ক্ষিত অসুবিধার জন্য আমি আন্তরিকভাবে ক্ষমাপ্রার্থী।"],
    ],
    guidance: "অনিচ্ছাকৃত ত্রুটি বা বিলম্বের জন্য বিনীতভাবে দুঃখ প্রকাশ করুন।",
  },
  firm: {
    greetingPrefix: "জনাব",
    signOff: "নিবেদক,",
    substitutions: [[/যদি সম্ভব হয় তবে/g, "অনুগ্রহ করে নির্ধারিত সময়ের মধ্যে"]],
    guidance: "স্পষ্ট ও দৃঢ়ভাবে সময়সীমা এবং করণীয় উল্লেখ করুন।",
  },
};

const ENGLISH_GREETING_LINE_REGEX =
  /^(Dear|Hi|Hello|Respected|Greetings|Good\s+(?:morning|afternoon|evening))\s+([^\n,]+),/i;

const BANGLA_GREETING_LINE_REGEX = /^(শ্রদ্ধেয়|প্রিয়|জনাব\/মহোদয়|জনাব|মহোদয়)\s+([^\n,।]+)[,।]?/u;

const ENGLISH_SIGNOFF_REGEX =
  /\n(Sincerely,|Best regards,|Kind regards,|Warm regards,|Warmly,|Regards,|Best,|Thanks,|Thank you,|Respectfully,|With sincere apologies,)\s*\n([^\n]+)\s*$/i;

const BANGLA_SIGNOFF_REGEX =
  /\n(বিনীত নিবেদক,|বিনীত,|শুভেচ্ছান্তে,|ধন্যবাদান্তে,|নিবেদক,|ইতি,|ান্তরিক দুঃখ প্রকাশপূর্বক, বিনীত,)\s*\n([^\n]+)\s*$/u;

export function applyToneToText(
  text: string,
  targetTone: ToneOption,
  language: SupportedLanguage = "English",
): string {
  const preset =
    language === "Bangla" ? BANGLA_TONE_PRESETS[targetTone] : ENGLISH_TONE_PRESETS[targetTone];

  let result = text.trim();

  if (language === "Bangla") {
    if (BANGLA_GREETING_LINE_REGEX.test(result)) {
      result = result.replace(BANGLA_GREETING_LINE_REGEX, `${preset.greetingPrefix} $2,`);
    }
    for (const [pattern, replacement] of preset.substitutions) {
      result = result.replace(pattern, replacement);
    }
    if (BANGLA_SIGNOFF_REGEX.test(result)) {
      result = result.replace(BANGLA_SIGNOFF_REGEX, `\n${preset.signOff}\n$2`);
    }
  } else {
    if (ENGLISH_GREETING_LINE_REGEX.test(result)) {
      result = result.replace(ENGLISH_GREETING_LINE_REGEX, `${preset.greetingPrefix} $2,`);
    }
    for (const [pattern, replacement] of preset.substitutions) {
      result = result.replace(pattern, replacement);
    }
    if (ENGLISH_SIGNOFF_REGEX.test(result)) {
      result = result.replace(ENGLISH_SIGNOFF_REGEX, `\n${preset.signOff}\n$2`);
    }
  }

  // Clean up accidental double spaces or triple newlines introduced by concise trimming
  result = result.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ");
  return result.trim();
}

export interface RewriteToneOutput {
  rewritten_text: string;
  target_tone: ToneOption;
  language: SupportedLanguage;
  applied_adjustments: string[];
  model_guidance: string;
}

export function rewriteTone(
  text: string,
  targetTone: ToneOption,
  language: SupportedLanguage = "English",
): RewriteToneOutput {
  const preset =
    language === "Bangla" ? BANGLA_TONE_PRESETS[targetTone] : ENGLISH_TONE_PRESETS[targetTone];
  const rewritten = applyToneToText(text, targetTone, language);

  const adjustments: string[] = [
    `Adjusted greeting prefix to "${preset.greetingPrefix}"`,
    `Adjusted closing sign-off to "${preset.signOff}"`,
  ];

  if (rewritten !== text.trim()) {
    adjustments.push(`Applied rule-based phrasing substitutions for "${targetTone}" tone`);
  }

  return {
    rewritten_text: rewritten,
    target_tone: targetTone,
    language,
    applied_adjustments: adjustments,
    model_guidance: preset.guidance,
  };
}

export function renderTemplate(
  template: EmailTemplate,
  values: Record<string, string | undefined>,
  options: {
    profile?: SenderProfile;
    tone?: ToneOption;
  } = {},
): RenderResult {
  const resolvedValues: Record<string, string> = {};
  const missingRequired: string[] = [];

  const profileSenderName = options.profile?.sender_name?.trim();
  const profileRole = options.profile?.role?.trim();
  const profileInstitution = options.profile?.institution?.trim();
  const profileSignature = options.profile?.email_signature?.trim();

  // First resolve all declared placeholders
  for (const placeholder of template.placeholders) {
    const providedRaw = values[placeholder.name];
    const provided = providedRaw !== undefined ? String(providedRaw).trim() : "";

    if (provided.length > 0) {
      resolvedValues[placeholder.name] = provided;
      continue;
    }

    // Global profile fallbacks
    if (placeholder.name === "sender_name" && profileSenderName) {
      resolvedValues.sender_name = profileSenderName;
      continue;
    }
    if (placeholder.name === "sender_role" && profileRole) {
      resolvedValues.sender_role = profileRole;
      continue;
    }
    if (placeholder.name === "institution" && profileInstitution) {
      resolvedValues.institution = profileInstitution;
      continue;
    }

    if (placeholder.default !== undefined && placeholder.default !== "") {
      resolvedValues[placeholder.name] = placeholder.default;
      continue;
    }

    if (placeholder.required) {
      missingRequired.push(placeholder.name);
    } else {
      resolvedValues[placeholder.name] = "";
    }
  }

  // Always support {{sender_name}} as a global value from the profile even if not in template.placeholders
  if (!resolvedValues.sender_name) {
    const explicitSender = values.sender_name?.trim();
    if (explicitSender) {
      resolvedValues.sender_name = explicitSender;
    } else if (profileSenderName) {
      resolvedValues.sender_name = profileSenderName;
    }
  }

  // Check if any required placeholders are still missing
  if (missingRequired.length > 0) {
    return {
      ok: false,
      subject: "",
      body: "",
      missing_required: missingRequired,
      used_values: resolvedValues,
      error: `Missing required placeholder value(s): ${missingRequired.join(", ")}`,
    };
  }

  const allowedKeys = new Set<string>([
    ...template.placeholders.map((p) => p.name),
    "sender_name",
  ]);

  const replaceTokens = (input: string): string =>
    input.replace(PLACEHOLDER_REGEX, (fullMatch, tokenName: string) => {
      if (!allowedKeys.has(tokenName)) {
        return fullMatch;
      }
      return resolvedValues[tokenName] ?? "";
    });

  const renderedSubject = replaceTokens(template.subject).trim();
  let renderedBody = replaceTokens(template.body).trim();

  const effectiveTone = options.tone ?? template.tone;
  if (options.tone && options.tone !== template.tone) {
    renderedBody = applyToneToText(renderedBody, effectiveTone, template.language);
  } else if (options.tone) {
    renderedBody = applyToneToText(renderedBody, options.tone, template.language);
  }

  if (profileSignature && !renderedBody.includes(profileSignature)) {
    renderedBody = `${renderedBody}\n${profileSignature}`;
  }

  // Track only keys that were actually used in the template
  const usedNames = new Set([
    ...extractPlaceholders(template.subject),
    ...extractPlaceholders(template.body),
  ]);
  const usedValues: Record<string, string> = {};
  for (const name of usedNames) {
    if (resolvedValues[name] !== undefined) {
      usedValues[name] = resolvedValues[name];
    }
  }

  return {
    ok: true,
    subject: renderedSubject,
    body: renderedBody,
    missing_required: [],
    used_values: usedValues,
  };
}

const COMMON_SPELLING_ERRORS: Record<string, string> = {
  recieve: "receive",
  seperate: "separate",
  occured: "occurred",
  definately: "definitely",
  accomodate: "accommodate",
  untill: "until",
  tommorow: "tomorrow",
  calender: "calendar",
  adress: "address",
  neccessary: "necessary",
  beleive: "believe",
  collegue: "colleague",
  wierd: "weird",
  publically: "publicly",
  maintainance: "maintenance",
  occassion: "occasion",
  arguement: "argument",
  commited: "committed",
  apoligize: "apologize",
  professer: "professor",
  assinment: "assignment",
  extention: "extension",
  recomendation: "recommendation",
  embarass: "embarrass",
  immedietly: "immediately",
  conveniant: "convenient",
};

const PASSIVE_VOICE_REGEX =
  /\b(?:am|is|are|was|were|been|being)\s+(?:[a-z]+ly\s+)?([a-z]+ed|done|made|sent|written|taken|given|shown|known|seen|found|held|kept|left|met|paid|put|read|run|said|set|sold|spent|told|thought|understood|won)\b/gi;

export function proofreadText(text: string, subject?: string): ProofreadResult {
  const trimmed = text.trim();
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Missing subject check
  const hasSubjectLineInText = /^Subject:\s*\S+/i.test(trimmed) || /^বিষয়:\s*\S+/u.test(trimmed);
  const hasExplicitSubject = Boolean(subject && subject.trim().length > 0);
  const subjectPassed = hasSubjectLineInText || hasExplicitSubject;

  const bodyLines = hasSubjectLineInText ? lines.slice(1) : lines;
  const firstBodyLine = bodyLines[0] ?? "";

  // 2. Missing greeting check
  const greetingPassed =
    /^(Dear|Hi|Hello|Respected|Greetings|Good\s+(?:morning|afternoon|evening)|Hey)\b/i.test(
      firstBodyLine,
    ) ||
    /^(শ্রদ্ধেয়|প্রিয়|জনাব|মহোদয়|আসসালামু আলাইকুম|নমস্কার)/u.test(firstBodyLine);

  // 3. Missing sign-off check
  const tailText = bodyLines.slice(-4).join("\n");
  const signOffPassed =
    /\b(Sincerely|Best regards|Kind regards|Warm regards|Warmly|Regards|Best|Thanks|Thank you|Respectfully|With sincere apologies|Yours truly|Yours sincerely|Cheers)\b/i.test(
      tailText,
    ) || /(বিনীত|ইতি|ধন্যবাদান্তে|শুভেচ্ছান্তে|নিবেদক)/u.test(tailText);

  // 4. Overly long sentences (> 30 words)
  const bodyWithoutHeaders = bodyLines.join(" ");
  const sentences = bodyWithoutHeaders
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const longSentences: string[] = [];
  for (const sentence of sentences) {
    const wordCount = sentence.split(/\s+/).filter(Boolean).length;
    if (wordCount > 30) {
      longSentences.push(
        `"${sentence.slice(0, 70)}..." (${wordCount} words)`,
      );
    }
  }
  const longSentencePassed = longSentences.length === 0;

  // 5. Unresolved {{placeholders}}
  const unresolvedInText = extractPlaceholders(trimmed);
  const unresolvedInSubject = subject ? extractPlaceholders(subject) : [];
  const allUnresolved = Array.from(new Set([...unresolvedInText, ...unresolvedInSubject]));
  const placeholdersPassed = allUnresolved.length === 0;

  // 6. Passive-heavy phrasing
  const passiveMatches: string[] = [];
  let passiveMatch: RegExpExecArray | null = PASSIVE_VOICE_REGEX.exec(bodyWithoutHeaders);
  while (passiveMatch !== null) {
    passiveMatches.push(passiveMatch[0]);
    passiveMatch = PASSIVE_VOICE_REGEX.exec(bodyWithoutHeaders);
  }
  PASSIVE_VOICE_REGEX.lastIndex = 0;

  const passivePassed = passiveMatches.length < 2;

  // 7. Spelling flags for common errors
  const words = trimmed.toLowerCase().match(/\b[a-z]+\b/g) ?? [];
  const spellingFlags: string[] = [];
  const seenTypos = new Set<string>();
  for (const word of words) {
    const correction = COMMON_SPELLING_ERRORS[word];
    if (correction && !seenTypos.has(word)) {
      seenTypos.add(word);
      spellingFlags.push(`"${word}" -> "${correction}"`);
    }
  }
  const spellingPassed = spellingFlags.length === 0;

  const checklist: ProofreadIssue[] = [
    {
      check: "missing_subject",
      passed: subjectPassed,
      details: subjectPassed
        ? "Subject line is present."
        : "No subject line detected (either provide a `Subject: ...` line at the top or pass a subject).",
      suggestions: subjectPassed
        ? []
        : ["Add a clear, specific `Subject: ...` line at the top of the message."],
    },
    {
      check: "missing_greeting",
      passed: greetingPassed,
      details: greetingPassed
        ? "Greeting/salutation is present."
        : "No standard greeting found at the beginning of the message.",
      suggestions: greetingPassed
        ? []
        : ["Start with a salutation such as 'Dear Professor [Name],' or 'Hi [Name],'."],
    },
    {
      check: "missing_sign_off",
      passed: signOffPassed,
      details: signOffPassed
        ? "Closing sign-off is present."
        : "No closing sign-off found at the end of the message.",
      suggestions: signOffPassed
        ? []
        : ["End with a professional sign-off such as 'Best regards,' or 'Sincerely,' followed by your name."],
    },
    {
      check: "overly_long_sentences",
      passed: longSentencePassed,
      details: longSentencePassed
        ? "All sentences are within a readable length (<= 30 words)."
        : `Found ${longSentences.length} overly long sentence(s): ${longSentences.join("; ")}`,
      suggestions: longSentencePassed
        ? []
        : ["Split sentences over 30 words into two shorter, clearer sentences."],
    },
    {
      check: "unresolved_placeholders",
      passed: placeholdersPassed,
      details: placeholdersPassed
        ? "No unresolved {{placeholders}} found."
        : `Found unresolved placeholder(s): ${allUnresolved.map((p) => `{{${p}}}`).join(", ")}`,
      suggestions: placeholdersPassed
        ? []
        : allUnresolved.map((p) => `Replace {{${p}}} with the actual value before sending.`),
    },
    {
      check: "passive_heavy_phrasing",
      passed: passivePassed,
      details: passivePassed
        ? "Active voice is used effectively."
        : `Detected passive-heavy phrasing (${passiveMatches.length} instances: ${passiveMatches.map((m) => `"${m}"`).join(", ")}).`,
      suggestions: passivePassed
        ? []
        : ["Rewrite passive constructions in active voice (e.g., 'I completed the task' instead of 'The task was completed')."],
    },
    {
      check: "spelling_flags",
      passed: spellingPassed,
      details: spellingPassed
        ? "No common spelling errors flagged."
        : `Flagged common spelling error(s): ${spellingFlags.join(", ")}`,
      suggestions: spellingFlags.map((flag) => `Fix typo: ${flag}`),
    },
  ];

  const passedCount = checklist.filter((item) => item.passed).length;
  const score = Math.round((passedCount / checklist.length) * 100);
  const passedAll = passedCount === checklist.length;

  return {
    passed_all: passedAll,
    score,
    checklist,
    summary: passedAll
      ? "All 7 proofreading checks passed. The message is clean and ready to send."
      : `Passed ${passedCount}/${checklist.length} checks (${score}%). Review flagged items before sending.`,
  };
}
