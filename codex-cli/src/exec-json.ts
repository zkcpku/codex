import type { ResponseItem } from "openai/resources/responses/responses";

import { getAssistantTextFromResponseItem } from "./quiet-mode.js";
import { parseToolCall } from "./utils/parsers.js";

type ThreadUsage = {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
};

type ThreadItem =
  | {
      id: string;
      type: "agent_message";
      text: string;
    }
  | {
      id: string;
      type: "reasoning";
      text: string;
    }
  | {
      id: string;
      type: "command_execution";
      command: string;
      aggregated_output: string;
      exit_code: number | null;
      status: "in_progress" | "completed" | "failed";
    };

export type ThreadEvent =
  | { type: "thread.started"; thread_id: string }
  | { type: "turn.started" }
  | { type: "turn.completed"; usage: ThreadUsage }
  | { type: "item.started"; item: ThreadItem }
  | { type: "item.completed"; item: ThreadItem };

export class ExecJsonEventFormatter {
  private readonly runningCommands = new Map<string, string>();

  constructor(private readonly threadId: string) {}

  threadStarted(): ThreadEvent {
    return {
      type: "thread.started",
      thread_id: this.threadId,
    };
  }

  turnStarted(): ThreadEvent {
    return { type: "turn.started" };
  }

  turnCompleted(): ThreadEvent {
    return {
      type: "turn.completed",
      usage: {
        input_tokens: 0,
        cached_input_tokens: 0,
        output_tokens: 0,
      },
    };
  }

  eventsForItem(item: ResponseItem): Array<ThreadEvent> {
    if (item.type === "message") {
      const text = getAssistantTextFromResponseItem(item);
      if (!text) {
        return [];
      }
      return [
        {
          type: "item.completed",
          item: {
            id: item.id,
            type: "agent_message",
            text,
          },
        },
      ];
    }

    const maybeReasoning = item as unknown as {
      type?: string;
      id?: string;
      summary?: Array<{ text: string }>;
    };
    if (maybeReasoning.type === "reasoning") {
      const text = maybeReasoning.summary?.map((summary) => summary.text).join("\n").trim();
      if (!text) {
        return [];
      }
      return [
        {
          type: "item.completed",
          item: {
            id: maybeReasoning.id ?? "reasoning",
            type: "reasoning",
            text,
          },
        },
      ];
    }

    if (item.type === "function_call") {
      const details = parseToolCall(item);
      const command = details?.cmdReadableText ?? item.name;
      this.runningCommands.set(item.call_id, command);
      return [
        {
          type: "item.started",
          item: {
            id: item.id,
            type: "command_execution",
            command,
            aggregated_output: "",
            exit_code: null,
            status: "in_progress",
          },
        },
      ];
    }

    if (item.type === "function_call_output") {
      const command = this.runningCommands.get(item.call_id) ?? "<unknown>";
      const meta = (item as { metadata?: unknown }).metadata as
        | { exit_code?: number }
        | undefined;
      const exitCode = typeof meta?.exit_code === "number" ? meta.exit_code : 0;
      return [
        {
          type: "item.completed",
          item: {
            id: item.id,
            type: "command_execution",
            command,
            aggregated_output: item.output,
            exit_code: exitCode,
            status: exitCode === 0 ? "completed" : "failed",
          },
        },
      ];
    }

    return [];
  }
}
