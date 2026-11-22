import { describe, expect, it } from "vitest";
import {
  applyToneToText,
  extractPlaceholders,
  proofreadText,
  renderTemplate,
  rewriteTone,
  validateTemplatePlaceholders,
} from "../src/templates/engine.js";
import { EmailTemplate, SenderProfile } from "../src/types.js";

const sampleTemplate: EmailTemplate = {
  id: "test-extension",
  name: "Extension Request",
  category: "teacher",
  audience: "teacher",
  language: "English",
  subject: "Extension Request for {{course_name}} - {{assignment_name}}",
  body: `Dear {{recipient_name}},

I hope this email finds you well. I am writing to let you know that I am working on {{assignment_name}} for {{course_name}}, and I would like to request an extension until {{new_date}} because {{reason}}.

Thank you for your consideration.

Best regards,
{{sender_name}}`,
  placeholders: [
    {
      name: "recipient_name",
      description: "Professor's name",
      required: true,
    },
    {
      name: "course_name",
      description: "Course title",
      required: true,
    },
    {
      name: "assignment_name",
      description: "Assignment title",
      required: true,
    },
    {
      name: "new_date",
      description: "Proposed new deadline",
      required: true,
    },
    {
      name: "reason",
      description: "Brief reason for extension",
      required: false,
      default: "an unexpected scheduling conflict",
    },
    {
      name: "sender_name",
      description: "Student's full name",
      required: false,
      default: "Student",
    },
  ],
  tone: "polite",
  is_builtin: true,
  created_at: "2025-01-01T00:00:00.000Z",
};

const sampleProfile: SenderProfile = {
  sender_name: "Arif Hossain",
  role: "CS Student & Freelance Web Developer",
  institution: "Dhaka University",
  email_signature: "",
  default_tone: "polite",
  default_language: "English",
  updated_at: "2025-01-01T00:00:00.000Z",
};

describe("Template Engine & Placeholder Utilities", () => {
  it("1. extracts unique placeholders from subject and body", () => {
    const tokens = extractPlaceholders(
      "Hello {{recipient_name}}, regarding {{project_name}} and {{ recipient_name }}!",
    );
    expect(tokens).toEqual(["recipient_name", "project_name"]);
  });

  it("2. validates when all placeholders in subject and body are declared", () => {
    const validation = validateTemplatePlaceholders(
      sampleTemplate.subject,
      sampleTemplate.body,
      sampleTemplate.placeholders,
    );
    expect(validation.valid).toBe(true);
    expect(validation.undeclared).toEqual([]);
  });

  it("3. fails validation when body contains undeclared placeholders", () => {
    const validation = validateTemplatePlaceholders(
      "Update on {{project}}",
      "Hi {{client_name}}, here is the {{undeclared_field}}.",
      [
        { name: "project", description: "Project", required: true },
        { name: "client_name", description: "Client", required: true },
      ],
    );
    expect(validation.valid).toBe(false);
    expect(validation.undeclared).toEqual(["undeclared_field"]);
    expect(validation.error).toContain("{{undeclared_field}}");
  });

  it("4. renders all provided placeholders accurately", () => {
    const result = renderTemplate(sampleTemplate, {
      recipient_name: "Professor Rahman",
      course_name: "CSE-302 Database Systems",
      assignment_name: "Lab 4 SQL Optimization",
      new_date: "Friday, November 22",
      reason: "a severe fever",
      sender_name: "Sohag",
    });

    expect(result.ok).toBe(true);
    expect(result.subject).toBe(
      "Extension Request for CSE-302 Database Systems - Lab 4 SQL Optimization",
    );
    expect(result.body).toContain("Dear Professor Rahman,");
    expect(result.body).toContain("until Friday, November 22 because a severe fever.");
    expect(result.body).toContain("Sohag");
  });

  it("5. uses default placeholder value when optional value is omitted", () => {
    const result = renderTemplate(sampleTemplate, {
      recipient_name: "Professor Rahman",
      course_name: "Database Systems",
      assignment_name: "ER Diagram",
      new_date: "Monday",
    });

    expect(result.ok).toBe(true);
    expect(result.body).toContain("because an unexpected scheduling conflict.");
    expect(result.body).toContain("Student");
  });

  it("6. returns clear error listing all missing required placeholders", () => {
    const result = renderTemplate(sampleTemplate, {
      recipient_name: "Professor Rahman",
    });

    expect(result.ok).toBe(false);
    expect(result.missing_required).toEqual(["course_name", "assignment_name", "new_date"]);
    expect(result.error).toContain("course_name, assignment_name, new_date");
  });

  it("7. ignores unused extra values passed to renderTemplate", () => {
    const result = renderTemplate(sampleTemplate, {
      recipient_name: "Professor Rahman",
      course_name: "Algorithms",
      assignment_name: "Homework 2",
      new_date: "Wednesday",
      unused_extra_key: "should be ignored",
      another_extra: "12345",
    });

    expect(result.ok).toBe(true);
    expect(result.body).not.toContain("should be ignored");
    expect(result.used_values.unused_extra_key).toBeUndefined();
  });

  it("8. injects {{sender_name}} from global profile when not explicitly provided in values", () => {
    const result = renderTemplate(
      sampleTemplate,
      {
        recipient_name: "Professor Rahman",
        course_name: "Operating Systems",
        assignment_name: "Kernel Module",
        new_date: "Sunday",
      },
      { profile: sampleProfile },
    );

    expect(result.ok).toBe(true);
    expect(result.body).toContain("Arif Hossain");
  });
});

describe("Tone Adjustment & Proofreader", () => {
  it("9. adjusts greeting, phrasing, and sign-off for 'friendly' tone", () => {
    const text = `Dear Sarah,

I would like to request your feedback on the landing page design. Thank you for your consideration.

Sincerely,
Arif`;

    const adjusted = applyToneToText(text, "friendly", "English");
    expect(adjusted).toContain("Hi Sarah,");
    expect(adjusted).toContain("I'd love to ask for your feedback");
    expect(adjusted).toContain("Thanks so much for considering this!");
    expect(adjusted).toContain("Warmly,\nArif");
  });

  it("10. expands contractions and uses formal sign-off for 'formal' tone", () => {
    const text = `Hi Dr. Karim,

I'm writing because I can't attend the lab today. Thanks for understanding.

Best,
Arif`;

    const adjusted = applyToneToText(text, "formal", "English");
    expect(adjusted).toContain("Dear Dr. Karim,");
    expect(adjusted).toContain("I am writing because I cannot attend");
    expect(adjusted).toContain("Thank you for understanding");
    expect(adjusted).toContain("Sincerely,\nArif");
  });

  it("11. removes filler openings for 'concise' tone", () => {
    const text = `Dear Client,

I hope this email finds you well. I am writing to let you know that the staging deployment is live. At your earliest convenience, please review it.

Best regards,
Arif`;

    const adjusted = applyToneToText(text, "concise", "English");
    expect(adjusted).toContain("Hello Client,");
    expect(adjusted).not.toContain("I hope this email finds you well.");
    expect(adjusted).toContain("the staging deployment is live. Please review it.");
    expect(adjusted).toContain("Best,\nArif");
  });

  it("12. adjusts Bangla greeting and sign-off for 'friendly' and 'formal' tones", () => {
    const banglaText = `শ্রদ্ধেয় স্যার,

আশা করি ভালো আছেন। আমার অ্যাসাইনমেন্ট জমা দিতে একদিন বিলম্ব হবে। ধন্যবাদ।

বিনীত,
আরিফ`;

    const formalBangla = rewriteTone(banglaText, "formal", "Bangla");
    expect(formalBangla.rewritten_text).toContain("আশা করি আপনি কুশলে আছেন।");
    expect(formalBangla.rewritten_text).toContain("বিনীত নিবেদক,\nআরিফ");
  });

  it("13. proofreadText detects missing subject, greeting, sign-off, unresolved placeholders, passive voice, and spelling typos", () => {
    const flawedDraft = `The assinment was delayed and the report was written yesterday by me. I definately need an extention until {{new_date}} because an unexpected issue occured during deployment that took a very long time to diagnose and resolve across multiple staging servers and database clusters in our local environment.`;

    const report = proofreadText(flawedDraft);
    expect(report.passed_all).toBe(false);

    const byCheck = Object.fromEntries(report.checklist.map((c) => [c.check, c]));
    expect(byCheck.missing_subject?.passed).toBe(false);
    expect(byCheck.missing_greeting?.passed).toBe(false);
    expect(byCheck.missing_sign_off?.passed).toBe(false);
    expect(byCheck.overly_long_sentences?.passed).toBe(false);
    expect(byCheck.unresolved_placeholders?.passed).toBe(false);
    expect(byCheck.passive_heavy_phrasing?.passed).toBe(false);
    expect(byCheck.spelling_flags?.passed).toBe(false);
  });

  it("14. proofreadText passes a clean, complete email", () => {
    const cleanEmail = `Subject: Project Milestone 2 Complete

Dear Alex,

I completed Milestone 2 for the dashboard application today. You can preview the live build on the staging link and share your feedback by Thursday.

Best regards,
Arif Hossain`;

    const report = proofreadText(cleanEmail);
    expect(report.passed_all).toBe(true);
    expect(report.score).toBe(100);
  });
});
