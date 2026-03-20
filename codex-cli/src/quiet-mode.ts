import type { ResponseItem } from "openai/resources/responses/responses";

import { parseToolCall } from "./utils/parsers.js";
import fs from "node:fs";

type QuietModeFormat = "human" | "json";

type QuietModeFormatOptions = {
  format: QuietModeFormat;
  prettyPrint?: boolean;
};

export function formatResponseItemForQuietMode(
  item: ResponseItem,
  options: QuietModeFormatOptions,
): string {
  if (options.format === "json") {
    return JSON.stringify(item);
  }

  if (options.prettyPrint === false) {
    return JSON.stringify(item);
  }

  switch (item.type) {
    case "message": {
      const role = item.role === "assistant" ? "assistant" : item.role;
      const txt = item.content
        .map((c) => {
          if (c.type === "output_text" || c.type === "input_text") {
            return c.text;
          }
          if (c.type === "input_image") {
            return "<Image>";
          }
          if (c.type === "input_file") {
            return c.filename;
          }
          if (c.type === "refusal") {
            return c.refusal;
          }
          return "?";
        })
        .join(" ");
      return `${role}: ${txt}`;
    }
    case "function_call": {
      const details = parseToolCall(item);
      return `$ ${details?.cmdReadableText ?? item.name}`;
    }
    case "function_call_output": {
      const meta = (item as { metadata?: unknown }).metadata as {
        exit_code?: number;
        duration_seconds?: number;
      };
      const parts: Array<string> = [];
      if (typeof meta.exit_code === "number") {
        parts.push(`code: ${meta.exit_code}`);
      }
      if (typeof meta.duration_seconds === "number") {
        parts.push(`duration: ${meta.duration_seconds}s`);
      }
      const header = parts.length > 0 ? ` (${parts.join(", ")})` : "";
      return `command.stdout${header}\n${item.output}`;
    }
    default: {
      return JSON.stringify(item);
    }
  }
}

export function getAssistantTextFromResponseItem(
  item: ResponseItem,
): string | undefined {
  if (item.type !== "message" || item.role !== "assistant") {
    return undefined;
  }

  const text = item.content
    .map((c) => {
      if (c.type === "output_text" || c.type === "refusal") {
        return c.type === "output_text" ? c.text : c.refusal;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();

  return text.length > 0 ? text : undefined;
}

export function writeLastAssistantMessage(
  filePath: string,
  text: string,
): void {
  const contents = text.endsWith("\n") ? text : `${text}\n`;
  fs.writeFileSync(filePath, contents, "utf8");
}
