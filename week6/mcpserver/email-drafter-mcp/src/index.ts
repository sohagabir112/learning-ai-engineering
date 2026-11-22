#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { DatabaseManager } from "./db.js";
import { registerAllPrompts } from "./prompts.js";
import { registerAllResources } from "./resources.js";
import { registerAllTools } from "./tools/index.js";

export interface EmailDrafterServerInstance {
  server: McpServer;
  db: DatabaseManager;
}

export function createEmailDrafterServer(dbPath?: string): EmailDrafterServerInstance {
  const db = new DatabaseManager(dbPath);

  const server = new McpServer({
    name: "email-drafter-mcp",
    version: "1.0.0",
  });

  registerAllTools(server, db);
  registerAllResources(server, db);
  registerAllPrompts(server);

  return { server, db };
}

async function main(): Promise<void> {
  try {
    const { server, db } = createEmailDrafterServer();
    const transport = new StdioServerTransport();

    process.on("SIGINT", () => {
      db.close();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      db.close();
      process.exit(0);
    });

    await server.connect(transport);
    console.error("[email-drafter-mcp] Server running on stdio transport.");
  } catch (error) {
    console.error("[email-drafter-mcp] Fatal startup error:", error);
    process.exit(1);
  }
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase();

if (isMain) {
  void main();
}
