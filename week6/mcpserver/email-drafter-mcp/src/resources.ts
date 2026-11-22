import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DatabaseManager } from "./db.js";
import { TEMPLATE_CATEGORIES, TemplateCategory } from "./types.js";

export function registerAllResources(server: McpServer, db: DatabaseManager): void {
  // 1. templates://all
  server.resource(
    "all-templates",
    "templates://all",
    {
      description: "All built-in and custom email templates as JSON",
      mimeType: "application/json",
    },
    async (uri) => {
      const templates = db.getAllTemplates();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(templates, null, 2),
          },
        ],
      };
    },
  );

  // 2. templates://{category}
  const categoryTemplate = new ResourceTemplate("templates://{category}", {
    list: async () => ({
      resources: TEMPLATE_CATEGORIES.map((category) => ({
        uri: `templates://${category}`,
        name: `Templates for ${category}`,
        description: `All email templates in the "${category}" category`,
        mimeType: "application/json",
      })),
    }),
  });

  server.resource(
    "templates-by-category",
    categoryTemplate,
    {
      description: "Email templates filtered by category (teacher, client, teammate, general)",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const rawCategory = String(variables.category ?? "");
      if (!TEMPLATE_CATEGORIES.includes(rawCategory as TemplateCategory)) {
        throw new Error(
          `Invalid template category "${rawCategory}". Valid categories: ${TEMPLATE_CATEGORIES.join(", ")}`,
        );
      }

      const templates = db.getAllTemplates(rawCategory as TemplateCategory);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(templates, null, 2),
          },
        ],
      };
    },
  );

  // 3. drafts://recent
  server.resource(
    "recent-drafts",
    "drafts://recent",
    {
      description: "The 10 most recent saved email drafts",
      mimeType: "application/json",
    },
    async (uri) => {
      const drafts = db.getRecentDrafts(10);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(drafts, null, 2),
          },
        ],
      };
    },
  );

  // 4. profile://me
  server.resource(
    "sender-profile",
    "profile://me",
    {
      description: "The current sender profile (name, role, institution, default tone/language)",
      mimeType: "application/json",
    },
    async (uri) => {
      const profile = db.getProfile();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    },
  );
}
