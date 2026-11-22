import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Contact,
  ContactType,
  DraftStatus,
  EmailDraft,
  EmailTemplate,
  EmailTemplateSummary,
  SenderProfile,
  SupportedLanguage,
  TemplateAudience,
  TemplateCategory,
  TemplatePlaceholder,
  ToneOption,
} from "./types.js";
import { BUILTIN_TEMPLATES } from "./templates/builtin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_DB_PATH = path.resolve(PROJECT_ROOT, "data", "drafts.db");
const DEFAULT_ENV_PATH = path.resolve(PROJECT_ROOT, ".env");

export function loadEnvFileSilently(envPath: string = DEFAULT_ENV_PATH): void {
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

interface TemplateRow {
  id: string;
  name: string;
  category: TemplateCategory;
  audience: TemplateAudience;
  language: SupportedLanguage;
  subject: string;
  body: string;
  placeholders_json: string;
  tone: ToneOption;
  is_builtin: number;
  created_at: string;
  updated_at: string;
}

interface DraftRow {
  id: number;
  title: string;
  recipient: string;
  subject: string;
  body: string;
  status: DraftStatus;
  created_at: string;
  updated_at: string;
}

interface ContactRow {
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

interface ProfileRow {
  id: number;
  sender_name: string;
  role: string;
  institution: string;
  email_signature: string;
  default_tone: ToneOption;
  default_language: SupportedLanguage;
  updated_at: string;
}

export interface ListTemplatesFilter {
  category?: TemplateCategory;
  audience?: TemplateAudience;
  language?: SupportedLanguage;
}

export interface CreateTemplateInput {
  id?: string;
  name: string;
  category: TemplateCategory;
  audience: TemplateAudience;
  language?: SupportedLanguage;
  subject: string;
  body: string;
  placeholders: TemplatePlaceholder[];
  tone?: ToneOption;
}

export interface UpdateTemplateInput {
  name?: string;
  category?: TemplateCategory;
  audience?: TemplateAudience;
  language?: SupportedLanguage;
  subject?: string;
  body?: string;
  placeholders?: TemplatePlaceholder[];
  tone?: ToneOption;
}

export interface SaveDraftInput {
  title: string;
  recipient: string;
  subject: string;
  body: string;
  status?: DraftStatus;
}

export interface ListDraftsFilter {
  status?: DraftStatus;
  recipient?: string;
  from_date?: string;
  to_date?: string;
}

export interface UpdateDraftInput {
  title?: string;
  recipient?: string;
  subject?: string;
  body?: string;
  status?: DraftStatus;
}

export interface SetProfileInput {
  sender_name?: string;
  role?: string;
  institution?: string;
  email_signature?: string;
  default_tone?: ToneOption;
  default_language?: SupportedLanguage;
}

export interface AddContactInput {
  name: string;
  email?: string;
  type: ContactType;
  organization?: string;
  notes?: string;
  preferred_tone?: ToneOption;
}

export interface ListContactsFilter {
  type?: ContactType;
  search?: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class DatabaseManager {
  private readonly db: Database.Database;

  constructor(dbPath?: string, builtinTemplates: EmailTemplate[] = BUILTIN_TEMPLATES) {
    if (dbPath !== ":memory:") {
      loadEnvFileSilently();
    }
    const rawPath = dbPath ?? process.env.DB_PATH ?? DEFAULT_DB_PATH;
    const resolvedPath =
      rawPath === ":memory:"
        ? ":memory:"
        : path.isAbsolute(rawPath)
          ? rawPath
          : path.resolve(PROJECT_ROOT, rawPath);

    if (resolvedPath !== ":memory:") {
      const dir = path.dirname(path.resolve(resolvedPath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(resolvedPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();

    if (builtinTemplates.length > 0) {
      this.seedBuiltinTemplates(builtinTemplates);
    }
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        audience TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'English',
        subject TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL,
        placeholders_json TEXT NOT NULL DEFAULT '[]',
        tone TEXT NOT NULL DEFAULT 'polite',
        is_builtin INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
      CREATE INDEX IF NOT EXISTS idx_templates_audience ON templates(audience);
      CREATE INDEX IF NOT EXISTS idx_templates_language ON templates(language);

      CREATE TABLE IF NOT EXISTS drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
      CREATE INDEX IF NOT EXISTS idx_drafts_recipient ON drafts(recipient);
      CREATE INDEX IF NOT EXISTS idx_drafts_created_at ON drafts(created_at);

      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL,
        organization TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        preferred_tone TEXT NOT NULL DEFAULT 'polite',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
      CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);

      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        sender_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        institution TEXT NOT NULL DEFAULT '',
        email_signature TEXT NOT NULL DEFAULT '',
        default_tone TEXT NOT NULL DEFAULT 'polite',
        default_language TEXT NOT NULL DEFAULT 'English',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const defaultSenderName = process.env.DEFAULT_SENDER_NAME ?? "";
    const defaultSenderRole = process.env.DEFAULT_SENDER_ROLE ?? "";
    const defaultSenderInstitution = process.env.DEFAULT_SENDER_INSTITUTION ?? "";

    const insertProfileStmt = this.db.prepare(`
      INSERT OR IGNORE INTO profile (
        id,
        sender_name,
        role,
        institution,
        email_signature,
        default_tone,
        default_language,
        updated_at
      ) VALUES (1, ?, ?, ?, '', 'polite', 'English', datetime('now'))
    `);
    insertProfileStmt.run(defaultSenderName, defaultSenderRole, defaultSenderInstitution);

    if (defaultSenderName || defaultSenderRole || defaultSenderInstitution) {
      const backfillStmt = this.db.prepare(`
        UPDATE profile
        SET
          sender_name = CASE WHEN sender_name = '' AND @sender_name != '' THEN @sender_name ELSE sender_name END,
          role = CASE WHEN role = '' AND @role != '' THEN @role ELSE role END,
          institution = CASE WHEN institution = '' AND @institution != '' THEN @institution ELSE institution END
        WHERE id = 1
      `);
      backfillStmt.run({
        sender_name: defaultSenderName,
        role: defaultSenderRole,
        institution: defaultSenderInstitution,
      });
    }
  }

  public seedBuiltinTemplates(templates: EmailTemplate[]): void {
    const upsertStmt = this.db.prepare(`
      INSERT INTO templates (
        id,
        name,
        category,
        audience,
        language,
        subject,
        body,
        placeholders_json,
        tone,
        is_builtin,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @name,
        @category,
        @audience,
        @language,
        @subject,
        @body,
        @placeholders_json,
        @tone,
        1,
        @created_at,
        datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        audience = excluded.audience,
        language = excluded.language,
        subject = excluded.subject,
        body = excluded.body,
        placeholders_json = excluded.placeholders_json,
        tone = excluded.tone,
        is_builtin = 1,
        updated_at = datetime('now')
      WHERE templates.is_builtin = 1
    `);

    const seedTransaction = this.db.transaction((items: EmailTemplate[]) => {
      for (const item of items) {
        upsertStmt.run({
          id: item.id,
          name: item.name,
          category: item.category,
          audience: item.audience,
          language: item.language,
          subject: item.subject,
          body: item.body,
          placeholders_json: JSON.stringify(item.placeholders),
          tone: item.tone,
          created_at: item.created_at,
        });
      }
    });

    seedTransaction(templates);
  }

  private mapTemplateRow(row: TemplateRow): EmailTemplate {
    let placeholders: TemplatePlaceholder[] = [];
    try {
      const parsed: unknown = JSON.parse(row.placeholders_json);
      if (Array.isArray(parsed)) {
        placeholders = parsed as TemplatePlaceholder[];
      }
    } catch {
      placeholders = [];
    }

    return {
      id: row.id,
      name: row.name,
      category: row.category,
      audience: row.audience,
      language: row.language,
      subject: row.subject,
      body: row.body,
      placeholders,
      tone: row.tone,
      is_builtin: row.is_builtin === 1,
      created_at: row.created_at,
    };
  }

  public listTemplates(filter: ListTemplatesFilter = {}): EmailTemplateSummary[] {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (filter.category) {
      conditions.push("category = @category");
      params.category = filter.category;
    }
    if (filter.audience) {
      conditions.push("audience = @audience");
      params.audience = filter.audience;
    }
    if (filter.language) {
      conditions.push("language = @language");
      params.language = filter.language;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const stmt = this.db.prepare(`
      SELECT * FROM templates
      ${whereClause}
      ORDER BY is_builtin DESC, category ASC, name ASC
    `);

    const rows = stmt.all(params) as TemplateRow[];
    return rows.map((row) => {
      const full = this.mapTemplateRow(row);
      return {
        id: full.id,
        name: full.name,
        category: full.category,
        audience: full.audience,
        language: full.language,
        tone: full.tone,
        is_builtin: full.is_builtin,
        placeholders: full.placeholders,
      };
    });
  }

  public getAllTemplates(category?: TemplateCategory): EmailTemplate[] {
    if (category) {
      const stmt = this.db.prepare(
        "SELECT * FROM templates WHERE category = ? ORDER BY is_builtin DESC, name ASC",
      );
      const rows = stmt.all(category) as TemplateRow[];
      return rows.map((r) => this.mapTemplateRow(r));
    }
    const stmt = this.db.prepare(
      "SELECT * FROM templates ORDER BY is_builtin DESC, category ASC, name ASC",
    );
    const rows = stmt.all() as TemplateRow[];
    return rows.map((r) => this.mapTemplateRow(r));
  }

  public getTemplate(id: string): EmailTemplate | undefined {
    const stmt = this.db.prepare("SELECT * FROM templates WHERE id = ?");
    const row = stmt.get(id) as TemplateRow | undefined;
    if (!row) {
      return undefined;
    }
    return this.mapTemplateRow(row);
  }

  public createTemplate(input: CreateTemplateInput): EmailTemplate {
    const baseId = input.id ? slugify(input.id) : `custom-${slugify(input.name)}`;
    if (!baseId) {
      throw new Error("Template name must contain valid alphanumeric characters to generate an id.");
    }

    let candidateId = baseId;
    let counter = 1;
    while (this.getTemplate(candidateId)) {
      if (input.id) {
        throw new Error(`A template with id "${input.id}" already exists.`);
      }
      counter += 1;
      candidateId = `${baseId}-${counter}`;
    }

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO templates (
        id,
        name,
        category,
        audience,
        language,
        subject,
        body,
        placeholders_json,
        tone,
        is_builtin,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @name,
        @category,
        @audience,
        @language,
        @subject,
        @body,
        @placeholders_json,
        @tone,
        0,
        @created_at,
        @updated_at
      )
    `);

    stmt.run({
      id: candidateId,
      name: input.name,
      category: input.category,
      audience: input.audience,
      language: input.language ?? "English",
      subject: input.subject,
      body: input.body,
      placeholders_json: JSON.stringify(input.placeholders),
      tone: input.tone ?? "polite",
      created_at: now,
      updated_at: now,
    });

    const created = this.getTemplate(candidateId);
    if (!created) {
      throw new Error("Failed to retrieve created template.");
    }
    return created;
  }

  public updateTemplate(id: string, input: UpdateTemplateInput): EmailTemplate {
    const existing = this.getTemplate(id);
    if (!existing) {
      throw new Error(`Template "${id}" not found.`);
    }
    if (existing.is_builtin) {
      throw new Error(`Cannot modify built-in template "${id}". Only user-created templates can be updated.`);
    }

    const updatedName = input.name ?? existing.name;
    const updatedCategory = input.category ?? existing.category;
    const updatedAudience = input.audience ?? existing.audience;
    const updatedLanguage = input.language ?? existing.language;
    const updatedSubject = input.subject ?? existing.subject;
    const updatedBody = input.body ?? existing.body;
    const updatedPlaceholders = input.placeholders ?? existing.placeholders;
    const updatedTone = input.tone ?? existing.tone;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE templates
      SET
        name = @name,
        category = @category,
        audience = @audience,
        language = @language,
        subject = @subject,
        body = @body,
        placeholders_json = @placeholders_json,
        tone = @tone,
        updated_at = @updated_at
      WHERE id = @id AND is_builtin = 0
    `);

    stmt.run({
      id,
      name: updatedName,
      category: updatedCategory,
      audience: updatedAudience,
      language: updatedLanguage,
      subject: updatedSubject,
      body: updatedBody,
      placeholders_json: JSON.stringify(updatedPlaceholders),
      tone: updatedTone,
      updated_at: now,
    });

    const updated = this.getTemplate(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated template "${id}".`);
    }
    return updated;
  }

  public deleteTemplate(id: string): boolean {
    const existing = this.getTemplate(id);
    if (!existing) {
      throw new Error(`Template "${id}" not found.`);
    }
    if (existing.is_builtin) {
      throw new Error(`Cannot delete built-in template "${id}". Only user-created templates can be deleted.`);
    }

    const stmt = this.db.prepare("DELETE FROM templates WHERE id = ? AND is_builtin = 0");
    const info = stmt.run(id);
    return info.changes > 0;
  }

  public saveDraft(input: SaveDraftInput): EmailDraft {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO drafts (title, recipient, subject, body, status, created_at, updated_at)
      VALUES (@title, @recipient, @subject, @body, @status, @created_at, @updated_at)
    `);

    const info = stmt.run({
      title: input.title,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      status: input.status ?? "draft",
      created_at: now,
      updated_at: now,
    });

    const draft = this.getDraft(Number(info.lastInsertRowid));
    if (!draft) {
      throw new Error("Failed to retrieve saved draft.");
    }
    return draft;
  }

  public listDrafts(filter: ListDraftsFilter = {}): EmailDraft[] {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (filter.status) {
      conditions.push("status = @status");
      params.status = filter.status;
    }
    if (filter.recipient) {
      conditions.push("LOWER(recipient) LIKE LOWER(@recipient)");
      params.recipient = `%${filter.recipient}%`;
    }
    if (filter.from_date) {
      conditions.push("created_at >= @from_date");
      params.from_date = filter.from_date;
    }
    if (filter.to_date) {
      conditions.push("created_at <= @to_date");
      params.to_date = filter.to_date;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const stmt = this.db.prepare(`
      SELECT * FROM drafts
      ${whereClause}
      ORDER BY created_at DESC, id DESC
    `);

    return stmt.all(params) as DraftRow[];
  }

  public getRecentDrafts(limit = 10): EmailDraft[] {
    const stmt = this.db.prepare(`
      SELECT * FROM drafts
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
    `);
    return stmt.all(limit) as DraftRow[];
  }

  public getDraft(id: number): EmailDraft | undefined {
    const stmt = this.db.prepare("SELECT * FROM drafts WHERE id = ?");
    return stmt.get(id) as DraftRow | undefined;
  }

  public updateDraft(id: number, input: UpdateDraftInput): EmailDraft {
    const existing = this.getDraft(id);
    if (!existing) {
      throw new Error(`Draft with id ${id} not found.`);
    }

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE drafts
      SET
        title = @title,
        recipient = @recipient,
        subject = @subject,
        body = @body,
        status = @status,
        updated_at = @updated_at
      WHERE id = @id
    `);

    stmt.run({
      id,
      title: input.title ?? existing.title,
      recipient: input.recipient ?? existing.recipient,
      subject: input.subject ?? existing.subject,
      body: input.body ?? existing.body,
      status: input.status ?? existing.status,
      updated_at: now,
    });

    const updated = this.getDraft(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated draft ${id}.`);
    }
    return updated;
  }

  public deleteDraft(id: number): boolean {
    const existing = this.getDraft(id);
    if (!existing) {
      throw new Error(`Draft with id ${id} not found.`);
    }

    const stmt = this.db.prepare("DELETE FROM drafts WHERE id = ?");
    const info = stmt.run(id);
    return info.changes > 0;
  }

  public getProfile(): SenderProfile {
    const stmt = this.db.prepare("SELECT * FROM profile WHERE id = 1");
    const row = stmt.get() as ProfileRow | undefined;
    if (!row) {
      return {
        sender_name: "",
        role: "",
        institution: "",
        email_signature: "",
        default_tone: "polite",
        default_language: "English",
        updated_at: new Date().toISOString(),
      };
    }

    return {
      sender_name: row.sender_name,
      role: row.role,
      institution: row.institution,
      email_signature: row.email_signature,
      default_tone: row.default_tone,
      default_language: row.default_language,
      updated_at: row.updated_at,
    };
  }

  public setProfile(input: SetProfileInput): SenderProfile {
    const current = this.getProfile();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE profile
      SET
        sender_name = @sender_name,
        role = @role,
        institution = @institution,
        email_signature = @email_signature,
        default_tone = @default_tone,
        default_language = @default_language,
        updated_at = @updated_at
      WHERE id = 1
    `);

    stmt.run({
      sender_name: input.sender_name ?? current.sender_name,
      role: input.role ?? current.role,
      institution: input.institution ?? current.institution,
      email_signature: input.email_signature ?? current.email_signature,
      default_tone: input.default_tone ?? current.default_tone,
      default_language: input.default_language ?? current.default_language,
      updated_at: now,
    });

    return this.getProfile();
  }

  public addContact(input: AddContactInput): Contact {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO contacts (
        name,
        email,
        type,
        organization,
        notes,
        preferred_tone,
        created_at,
        updated_at
      ) VALUES (
        @name,
        @email,
        @type,
        @organization,
        @notes,
        @preferred_tone,
        @created_at,
        @updated_at
      )
    `);

    const info = stmt.run({
      name: input.name,
      email: input.email ?? "",
      type: input.type,
      organization: input.organization ?? "",
      notes: input.notes ?? "",
      preferred_tone: input.preferred_tone ?? "polite",
      created_at: now,
      updated_at: now,
    });

    const contact = this.getContact({ id: Number(info.lastInsertRowid) });
    if (!contact) {
      throw new Error("Failed to retrieve created contact.");
    }
    return contact;
  }

  public listContacts(filter: ListContactsFilter = {}): Contact[] {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (filter.type) {
      conditions.push("type = @type");
      params.type = filter.type;
    }
    if (filter.search) {
      conditions.push(
        "(LOWER(name) LIKE LOWER(@search) OR LOWER(email) LIKE LOWER(@search) OR LOWER(organization) LIKE LOWER(@search))",
      );
      params.search = `%${filter.search}%`;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const stmt = this.db.prepare(`
      SELECT * FROM contacts
      ${whereClause}
      ORDER BY name ASC, id ASC
    `);

    return stmt.all(params) as ContactRow[];
  }

  public getContact(query: { id?: number; name?: string; email?: string }): Contact | undefined {
    if (query.id !== undefined) {
      const stmt = this.db.prepare("SELECT * FROM contacts WHERE id = ?");
      return stmt.get(query.id) as ContactRow | undefined;
    }
    if (query.email) {
      const stmt = this.db.prepare("SELECT * FROM contacts WHERE LOWER(email) = LOWER(?) LIMIT 1");
      return stmt.get(query.email) as ContactRow | undefined;
    }
    if (query.name) {
      const exactStmt = this.db.prepare(
        "SELECT * FROM contacts WHERE LOWER(name) = LOWER(?) LIMIT 1",
      );
      const exact = exactStmt.get(query.name) as ContactRow | undefined;
      if (exact) {
        return exact;
      }
      const partialStmt = this.db.prepare(
        "SELECT * FROM contacts WHERE LOWER(name) LIKE LOWER(?) ORDER BY id ASC LIMIT 1",
      );
      return partialStmt.get(`%${query.name}%`) as ContactRow | undefined;
    }
    return undefined;
  }

  public close(): void {
    this.db.close();
  }
}
