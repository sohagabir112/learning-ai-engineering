import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseManager } from "../src/db.js";
import { BUILTIN_TEMPLATES } from "../src/templates/builtin.js";
import { validateTemplatePlaceholders } from "../src/templates/engine.js";
import { executeAddContact } from "../src/tools/add_contact.js";
import { executeCreateTemplate } from "../src/tools/create_template.js";
import { executeDeleteDraft } from "../src/tools/delete_draft.js";
import { executeDeleteTemplate } from "../src/tools/delete_template.js";
import { executeDraftCustom } from "../src/tools/draft_custom.js";
import { executeDraftFromTemplate } from "../src/tools/draft_from_template.js";
import { executeGetContact } from "../src/tools/get_contact.js";
import { executeGetDraft } from "../src/tools/get_draft.js";
import { executeGetProfile } from "../src/tools/get_profile.js";
import { executeGetTemplate } from "../src/tools/get_template.js";
import { executeListContacts } from "../src/tools/list_contacts.js";
import { executeListDrafts } from "../src/tools/list_drafts.js";
import { executeListTemplates } from "../src/tools/list_templates.js";
import { executeProofreadCheck } from "../src/tools/proofread_check.js";
import { executeRewriteTone } from "../src/tools/rewrite_tone.js";
import { executeSaveDraft } from "../src/tools/save_draft.js";
import { executeSetProfile } from "../src/tools/set_profile.js";
import { executeUpdateDraft } from "../src/tools/update_draft.js";
import { executeUpdateTemplate } from "../src/tools/update_template.js";

describe("MCP Tools & Database Integration", () => {
  let db: DatabaseManager;

  beforeEach(() => {
    db = new DatabaseManager(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("15. seeds at least 25 built-in templates and validates all placeholders are declared", () => {
    expect(BUILTIN_TEMPLATES.length).toBeGreaterThanOrEqual(25);

    const listResult = executeListTemplates(db, {});
    expect(listResult.isError).toBeUndefined();
    const structured = listResult.structuredContent as { count: number };
    expect(structured.count).toBe(BUILTIN_TEMPLATES.length);

    for (const template of BUILTIN_TEMPLATES) {
      expect(template.subject.length).toBeGreaterThan(3);
      expect(template.body.length).toBeGreaterThan(20);
      const check = validateTemplatePlaceholders(
        template.subject,
        template.body,
        template.placeholders,
      );
      expect(check.valid, `Template ${template.id} failed placeholder check`).toBe(true);
    }
  });

  it("16. draft_from_template renders email using global profile sender_name", () => {
    executeSetProfile(db, {
      sender_name: "Sohag Ahmed",
      role: "Full-Stack Developer",
      institution: "BRAC University",
    });

    const res = executeDraftFromTemplate(db, {
      template_id: "teacher-extension-request",
      values: {
        recipient_name: "Professor Rahman",
        course_name: "CSE-370 Database Systems",
        assignment_name: "B+ Tree Indexing Project",
        new_due_date: "Monday, November 25",
      },
      tone: "polite",
    });

    expect(res.isError).toBeUndefined();
    const structured = res.structuredContent as { subject: string; body: string };
    expect(structured.subject).toBe(
      "Extension Request: CSE-370 Database Systems - B+ Tree Indexing Project",
    );
    expect(structured.body).toContain("Dear Professor Rahman,");
    expect(structured.body).toContain("Monday, November 25");
    expect(structured.body).toContain("Sohag Ahmed");
  });

  it("17. draft_from_template auto-fills recipient_name and preferred_tone from a saved contact", () => {
    const contactRes = executeAddContact(db, {
      name: "Professor Dr. M. Rahman",
      email: "rahman@university.edu",
      type: "teacher",
      organization: "Department of CSE",
      preferred_tone: "formal",
    });
    expect(contactRes.isError).toBeUndefined();

    const draftRes = executeDraftFromTemplate(db, {
      template_id: "teacher-absence-notice",
      contact_name: "Rahman",
      values: {
        course_name: "Software Engineering",
        absence_date: "November 20, 2026",
        reason: "attending a national hackathon final",
        sender_name: "Sohag",
      },
    });

    expect(draftRes.isError).toBeUndefined();
    const structured = draftRes.structuredContent as {
      subject: string;
      body: string;
      tone: string;
    };
    expect(structured.tone).toBe("formal");
    expect(structured.body).toContain("Dear Professor Dr. M. Rahman,");
    expect(structured.body).toContain("Sincerely,\nSohag");
  });

  it("18. draft_from_template automatically switches to Bangla variant when language='Bangla'", () => {
    const draftRes = executeDraftFromTemplate(db, {
      template_id: "teacher-extension-request",
      language: "Bangla",
      values: {
        recipient_name: "প্রফেসর রহমান",
        course_name: "ডেটাবেস সিস্টেমস",
        assignment_name: "এসকিউএল প্রজেক্ট",
        new_due_date: "আগামী শুক্রবার",
        sender_name: "সোহাগ",
      },
    });

    expect(draftRes.isError).toBeUndefined();
    const structured = draftRes.structuredContent as {
      template_id: string;
      language: string;
      subject: string;
      body: string;
    };
    expect(structured.template_id).toBe("teacher-extension-request-bn");
    expect(structured.language).toBe("Bangla");
    expect(structured.body).toContain("শ্রদ্ধেয় প্রফেসর রহমান,");
    expect(structured.body).toContain("আগামী শুক্রবার");
  });

  it("19. draft_from_template returns isError: true when required placeholders are missing", () => {
    const draftRes = executeDraftFromTemplate(db, {
      template_id: "client-delay-notice",
      values: {
        recipient_name: "Sarah Jenkins",
      },
    });

    expect(draftRes.isError).toBe(true);
    const text = draftRes.content[0]?.type === "text" ? draftRes.content[0].text : "";
    expect(text).toContain("Missing required placeholder value(s): project_name, new_date");
  });

  it("20. create_template validates undeclared placeholders and prevents editing/deleting built-in templates", () => {
    const badCreate = executeCreateTemplate(db, {
      name: "Broken Template",
      category: "client",
      audience: "client",
      subject: "Hello {{client_name}}",
      body: "Dear {{client_name}}, your {{secret_token}} is ready.",
      placeholders: [
        { name: "client_name", description: "Client name", required: true },
      ],
    });
    expect(badCreate.isError).toBe(true);

    const goodCreate = executeCreateTemplate(db, {
      name: "Sprint Demo Invite",
      category: "client",
      audience: "client",
      subject: "Demo Invite: {{sprint_name}}",
      body: "Dear {{recipient_name}},\n\nJoin our demo for {{sprint_name}}.\n\nBest regards,\n{{sender_name}}",
      placeholders: [
        { name: "recipient_name", description: "Client name", required: true },
        { name: "sprint_name", description: "Sprint title", required: true },
        { name: "sender_name", description: "Sender", required: false, default: "Dev" },
      ],
    });
    expect(goodCreate.isError).toBeUndefined();

    // Updating and deleting custom template succeeds
    const updateCustom = executeUpdateTemplate(db, {
      id: "custom-sprint-demo-invite",
      name: "Updated Sprint Demo Invite",
    });
    expect(updateCustom.isError).toBeUndefined();

    const deleteCustom = executeDeleteTemplate(db, {
      id: "custom-sprint-demo-invite",
    });
    expect(deleteCustom.isError).toBeUndefined();

    // Updating or deleting built-in template is rejected
    const updateBuiltin = executeUpdateTemplate(db, {
      id: "teacher-extension-request",
      name: "Hacked Name",
    });
    expect(updateBuiltin.isError).toBe(true);

    const deleteBuiltin = executeDeleteTemplate(db, {
      id: "teacher-extension-request",
    });
    expect(deleteBuiltin.isError).toBe(true);
  });

  it("21. manages drafts lifecycle (save_draft, list_drafts, get_draft, update_draft, delete_draft)", () => {
    const saved = executeSaveDraft(db, {
      title: "E-commerce Delay Notice",
      recipient: "client@shop.com",
      subject: "Timeline Update Regarding E-commerce Checkout",
      body: "Dear Client,\n\nWe need until Friday.\n\nBest regards,\nSohag",
      status: "draft",
    });
    expect(saved.isError).toBeUndefined();

    const listRes = executeListDrafts(db, { status: "draft", recipient: "shop.com" });
    const listData = listRes.structuredContent as { count: number };
    expect(listData.count).toBe(1);

    const updateRes = executeUpdateDraft(db, { id: 1, status: "ready" });
    expect(updateRes.isError).toBeUndefined();

    const getRes = executeGetDraft(db, { id: 1 });
    const getData = getRes.structuredContent as { draft: { status: string } };
    expect(getData.draft.status).toBe("ready");

    const delRes = executeDeleteDraft(db, { id: 1 });
    expect(delRes.isError).toBeUndefined();
  });

  it("22. executes get_template, get_profile, list_contacts, get_contact, draft_custom, rewrite_tone, and proofread_check", () => {
    expect(executeGetTemplate(db, { id: "teammate-standup-summary" }).isError).toBeUndefined();
    expect(executeGetProfile(db).isError).toBeUndefined();

    executeAddContact(db, {
      name: "Nadia Islam",
      email: "nadia@team.dev",
      type: "teammate",
      organization: "Frontend Squad",
      preferred_tone: "friendly",
    });
    expect(executeListContacts(db, { type: "teammate" }).isError).toBeUndefined();
    expect(executeGetContact(db, { email: "nadia@team.dev" }).isError).toBeUndefined();

    const customBrief = executeDraftCustom(db, {
      purpose: "Request API credentials for Stripe webhook testing",
      recipient_type: "client",
      key_points: ["Need test mode webhook secret", "Required before Friday deployment"],
      tone: "polite",
      length: "short",
    });
    expect(customBrief.isError).toBeUndefined();

    const rewritten = executeRewriteTone({
      text: "Dear Alex,\n\nI'm writing to say I can't make the call.\n\nBest,\nSohag",
      target_tone: "formal",
    });
    expect(rewritten.isError).toBeUndefined();

    const proofread = executeProofreadCheck({
      text: "Subject: Quick Update\n\nHi Nadia,\n\nI pushed the updated components to main.\n\nBest,\nSohag",
    });
    expect(proofread.isError).toBeUndefined();
  });
});
