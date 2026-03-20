import type { ResponseItem } from "openai/resources/responses/responses";

import {
  formatResponseItemForQuietMode,
  getAssistantTextFromResponseItem,
} from "../src/quiet-mode.js";
import { describe, expect, it } from "vitest";

describe("quiet mode formatting", () => {
  it("formats assistant messages for human-readable output", () => {
    const item: ResponseItem = {
      id: "msg_1",
      status: "completed",
      type: "message",
      role: "assistant",
      content: [
        { type: "output_text", text: "hello from codex", annotations: [] },
      ],
    };

    expect(
      formatResponseItemForQuietMode(item, {
        format: "human",
        prettyPrint: true,
      }),
    ).toBe("assistant: hello from codex");
  });

  it("formats response items as json lines in json mode", () => {
    const item: ResponseItem = {
      id: "msg_1",
      status: "completed",
      type: "message",
      role: "assistant",
      content: [
        { type: "output_text", text: "hello from codex", annotations: [] },
      ],
    };

    expect(
      formatResponseItemForQuietMode(item, {
        format: "json",
        prettyPrint: true,
      }),
    ).toBe(JSON.stringify(item));
  });
});

describe("last assistant message extraction", () => {
  it("extracts the final assistant text from message items", () => {
    const item: ResponseItem = {
      id: "msg_2",
      status: "completed",
      type: "message",
      role: "assistant",
      content: [
        { type: "output_text", text: "first line", annotations: [] },
        { type: "output_text", text: "second line", annotations: [] },
      ],
    };

    expect(getAssistantTextFromResponseItem(item)).toBe(
      "first line\nsecond line",
    );
  });

  it("ignores non-assistant items", () => {
    const item: ResponseItem = {
      type: "function_call",
      call_id: "call_123",
      name: "shell",
      arguments: "{}",
      id: "fc_123",
      status: "completed",
    };

    expect(getAssistantTextFromResponseItem(item)).toBeUndefined();
  });
});
