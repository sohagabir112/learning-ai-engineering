import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";

export function toolSuccess(
  text: string,
  structured?: Record<string, unknown>,
): CallToolResult {
  const response: CallToolResult = {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };

  if (structured) {
    response.structuredContent = structured;
  }

  return response;
}

export function toolError(error: unknown): CallToolResult {
  if (error instanceof ZodError) {
    const details = error.errors
      .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
      .join("; ");
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Validation Error: ${details}`,
        },
      ],
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Error: ${message}`,
      },
    ],
  };
}
