# email-drafter-mcp

A production-quality **Model Context Protocol (MCP)** server built with TypeScript, `@modelcontextprotocol/sdk`, Zod, and SQLite (`better-sqlite3`). It helps a **student and freelance web developer** draft, customize, proofread, save, and reuse professional emails and messages for **teachers, clients, and teammates** in both **English** and **Bangla**—without ever sending emails automatically.

---

## Features

- **32 Built-in Templates**: Covers academic emails to professors (including Bangla variants), freelance client communications, engineering teammate updates, and general professional correspondence.
- **Smart Template Engine**: Replaces `{{placeholders}}`, applies default values, validates required placeholders, ignores unused inputs, and resolves `{{sender_name}}` globally from your stored profile.
- **Contact-Aware Personalization**: Supplying a saved contact to `draft_from_template` auto-fills `recipient_name` (and organization) and applies the contact's `preferred_tone`.
- **Rule-Based Tone & Language Engine**: Supports `formal`, `polite`, `friendly`, `concise`, `apologetic`, and `firm` tones across `English` and `Bangla`.
- **7-Point Proofread Check**: Flags missing subjects, missing greetings, missing sign-offs, overly long sentences (>30 words), unresolved `{{placeholders}}`, passive-heavy phrasing, and common spelling errors.
- **Persistent SQLite Storage**: Single-file SQLite database at `./data/drafts.db` storing custom templates, saved drafts, contacts, and your sender profile.

---

## Installation & Build

### Prerequisites
- **Node.js 20+** and **npm**

### Setup

```bash
cd email-drafter-mcp
npm install
npm run build
```

### Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `tsx src/index.ts` | Run the MCP server in development mode |
| `npm run build` | `tsc` | Compile TypeScript to `./dist` |
| `npm start` | `node dist/index.js` | Run the compiled production MCP server |
| `npm test` | `vitest run` | Run the Vitest unit & integration test suite |
| `npm run lint` | `eslint "src/**/*.ts" "tests/**/*.ts"` | Lint all source and test files |

---

## Claude Desktop Configuration

Add the following entry to your `claude_desktop_config.json` file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "email-drafter": {
      "command": "node",
      "args": [
        "C:\\Users\\sohag\\Learning AI Engineering\\week6\\mcpserver\\email-drafter-mcp\\dist\\index.js"
      ],
      "env": {
        "DB_PATH": "C:\\Users\\sohag\\Learning AI Engineering\\week6\\mcpserver\\email-drafter-mcp\\data\\drafts.db"
      }
    }
  }
}
```

---

## Tool Reference Table

| Tool Name | Input Arguments | Description |
| :--- | :--- | :--- |
| `list_templates` | `category?`, `audience?`, `language?` | List templates filtered by category (`teacher`, `client`, `teammate`, `general`), audience, or language (`English`, `Bangla`). |
| `get_template` | `id` | Retrieve the full template definition, subject, body, and placeholder metadata by ID. |
| `draft_from_template` | `template_id`, `values`, `tone?`, `language?`, `contact_id?`, `contact_name?` | Render `{ subject, body }` from a template with tone/language overrides and contact auto-fill. |
| `draft_custom` | `purpose`, `recipient_type`, `key_points`, `tone?`, `length?` | Generate a structured drafting brief (subject suggestion, outline, constraints) without calling external AI APIs. |
| `rewrite_tone` | `text`, `target_tone`, `language?` | Adjust greeting, phrasing, and sign-off to a target tone (`formal`, `polite`, `friendly`, `concise`, `apologetic`, `firm`). |
| `create_template` | `name`, `category`, `audience`, `subject`, `body`, `placeholders`, `id?`, `language?`, `tone?` | Validate that all `{{placeholders}}` in subject/body are declared and save a new custom template to SQLite. |
| `update_template` | `id`, `name?`, `category?`, `audience?`, `language?`, `subject?`, `body?`, `placeholders?`, `tone?` | Update a user-created template (built-in templates are protected). |
| `delete_template` | `id` | Delete a user-created template by ID (built-in templates cannot be deleted). |
| `save_draft` | `title`, `recipient`, `subject`, `body`, `status?` | Save an email draft with status (`draft`, `ready`, or `sent`). |
| `list_drafts` | `status?`, `recipient?`, `from_date?`, `to_date?` | Filter saved drafts by status, recipient substring, or ISO date range. |
| `get_draft` | `id` | Retrieve a saved draft by numeric ID. |
| `update_draft` | `id`, `title?`, `recipient?`, `subject?`, `body?`, `status?` | Update an existing saved draft. |
| `delete_draft` | `id` | Delete a saved draft by numeric ID. |
| `set_profile` | `sender_name?`, `role?`, `institution?`, `email_signature?`, `default_tone?`, `default_language?` | Save your sender profile used globally for `{{sender_name}}` and default preferences. |
| `get_profile` | *(none)* | Retrieve the current sender profile. |
| `add_contact` | `name`, `type`, `email?`, `organization?`, `notes?`, `preferred_tone?` | Save a `teacher`, `client`, or `teammate` contact with their preferred tone. |
| `list_contacts` | `type?`, `search?` | List saved contacts filtered by type or keyword search. |
| `get_contact` | `id?`, `name?`, `email?` | Retrieve a single contact by ID, name, or email. |
| `proofread_check` | `text`, `subject?` | Run a 7-point checklist (missing subject/greeting/sign-off, >30-word sentences, unresolved `{{placeholders}}`, passive voice, and spelling typos). |

---

## MCP Resources & Prompts

### Resources
- `templates://all` — JSON array of all built-in and custom templates
- `templates://{category}` — JSON array of templates for `teacher`, `client`, `teammate`, or `general`
- `drafts://recent` — JSON array of the 10 most recently updated drafts
- `profile://me` — JSON object of the current sender profile

### Prompts
- `write_email` (`recipient_type`, `purpose`, `tone`) — Guides the model to pick a template or use `draft_custom`
- `polish_email` (`text`, `target_tone?`) — Guides the model to run `proofread_check` and `rewrite_tone`
- `reply_to_email` (`original_email`, `intent`, `tone?`) — Guides a structured reply (`accept`, `decline`, `ask more`, `postpone`)
- `weekly_client_update` (`project_name`, `done`, `in_progress`, `blockers?`, `recipient_name?`) — Produces a weekly client progress email

---

## 8 Example Prompts for Claude Desktop

1. **Professor Extension Request**:
   > "Draft an extension request to Professor Rahman for my database assignment, polite tone"
2. **Client Delay Notice**:
   > "Write a delay notice to my client for the e-commerce project, new date is Friday"
3. **Team Standup Summary**:
   > "Give me a standup summary for my team"
4. **Bangla Absence Notice**:
   > "Translate my absence notice to Bangla" (or *"Draft a class absence notice to Professor Karim in Bangla for my Algorithms course tomorrow"*)
5. **Client Scope Change Quote**:
   > "My client asked to add multi-currency Stripe checkout to the SaaS dashboard. Draft a firm scope change email showing $450 additional cost and 4 extra days."
6. **Code Review Request**:
   > "Draft a friendly code review request to my teammate Nadia for PR #42 'Implement JWT refresh token rotation'."
7. **Proofread & Tone Polish**:
   > "Run proofread_check on my draft and rewrite the tone to be more formal: 'Hi Prof, I cant submit the assinment today until {{new_date}} because a bug occured.'"
8. **Save Profile & Contact Workflow**:
   > "Save my profile name as 'Sohag Ahmed', role 'CS Student & Freelance Web Developer', add Professor Rahman as a teacher contact with formal tone, and draft a meeting request to him about my thesis topic."

---

## Testing with the MCP Inspector

You can interactively inspect and test all tools, resources, and prompts using the official MCP Inspector:

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

Once the Inspector UI opens in your browser:
1. Go to the **Tools** tab and test `list_templates`, `draft_from_template`, or `proofread_check`.
2. Go to the **Resources** tab and read `templates://all`, `templates://teacher`, `drafts://recent`, and `profile://me`.
3. Go to the **Prompts** tab and execute `write_email`, `polish_email`, `reply_to_email`, or `weekly_client_update`.
