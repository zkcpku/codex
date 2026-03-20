import type { ResponseItem } from "openai/resources/responses/responses";

import { ExecJsonEventFormatter } from "../src/exec-json.js";
import { describe, expect, it } from "vitest";

describe("ExecJsonEventFormatter", () => {
  it("emits thread and turn lifecycle events", () => {
    const formatter = new ExecJsonEventFormatter("thread-123");
    expect(formatter.threadStarted()).toEqual({
      type: "thread.started",
      thread_id: "thread-123",
    });
    expect(formatter.turnStarted()).toEqual({ type: "turn.started" });
    expect(formatter.turnCompleted()).toEqual({
      type: "turn.completed",
      usage: {
        input_tokens: 0,
        cached_input_tokens: 0,
        output_tokens: 0,
      },
    });
    expect(formatter.streamError("boom")).toEqual({
      type: "error",
      message: "boom",
    });
    expect(formatter.turnFailed("boom")).toEqual({
      type: "turn.failed",
      error: { message: "boom" },
    });
  });

  it("converts assistant messages into agent_message items", () => {
    const formatter = new ExecJsonEventFormatter("thread-123");
    const item: ResponseItem = {
      id: "msg_1",
      status: "completed",
      type: "message",
      role: "assistant",
      content: [
        { type: "output_text", text: "hello from codex", annotations: [] },
      ],
    };

    expect(formatter.eventsForItem(item)).toEqual([
      {
        type: "item.completed",
        item: {
          id: "msg_1",
          type: "agent_message",
          text: "hello from codex",
        },
      },
    ]);
  });

  it("converts reasoning items into reasoning events", () => {
    const formatter = new ExecJsonEventFormatter("thread-123");
    const events = formatter.eventsForItem({
      id: "reasoning_1",
      type: "reasoning",
      summary: [{ text: "Thinking about the right patch." }],
    } as unknown as ResponseItem);

    expect(events).toEqual([
      {
        type: "item.completed",
        item: {
          id: "reasoning_1",
          type: "reasoning",
          text: "Thinking about the right patch.",
        },
      },
    ]);
  });

  it("converts function calls into command execution lifecycle events", () => {
    const formatter = new ExecJsonEventFormatter("thread-123");
    const started = formatter.eventsForItem({
      id: "fc_1",
      type: "function_call",
      call_id: "call_1",
      name: "shell",
      arguments: JSON.stringify({ cmd: ["echo", "hello"] }),
      status: "completed",
    });

    const completed = formatter.eventsForItem({
      id: "fco_1",
      type: "function_call_output",
      call_id: "call_1",
      output: "hello\n",
    } as ResponseItem);

    expect(started).toEqual([
      {
        type: "item.started",
        item: {
          id: "fc_1",
          type: "command_execution",
          command: "echo hello",
          aggregated_output: "",
          exit_code: null,
          status: "in_progress",
        },
      },
    ]);
    expect(completed).toEqual([
      {
        type: "item.completed",
        item: {
          id: "fco_1",
          type: "command_execution",
          command: "echo hello",
          aggregated_output: "hello\n",
          exit_code: 0,
          status: "completed",
        },
      },
    ]);
  });

  it("converts apply_patch calls into file_change items", () => {
    const formatter = new ExecJsonEventFormatter("thread-123");
    const events = formatter.eventsForItem({
      id: "patch_1",
      type: "function_call",
      call_id: "call_patch_1",
      name: "apply_patch",
      arguments: JSON.stringify({
        patch: [
          "*** Begin Patch",
          "*** Add File: foo.txt",
          "+hello",
          "*** Update File: bar.txt",
          "@@",
          "-old",
          "+new",
          "*** Delete File: baz.txt",
          "*** End Patch",
        ].join("\n"),
      }),
      status: "completed",
    });

    expect(events).toEqual([
      {
        type: "item.completed",
        item: {
          id: "patch_1",
          type: "file_change",
          changes: [
            { path: "foo.txt", kind: "add" },
            { path: "bar.txt", kind: "update" },
            { path: "baz.txt", kind: "delete" },
          ],
          status: "completed",
        },
      },
    ]);
  });
});
