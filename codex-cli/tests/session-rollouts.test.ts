import {
  buildForkPrompt,
  buildResumePrompt,
  parseResumePositionalArgs,
} from "../src/session-rollouts.js";
import { describe, expect, it } from "vitest";

describe("parseResumePositionalArgs", () => {
  it("treats the first positional as session id by default", () => {
    expect(
      parseResumePositionalArgs({
        positional: ["session-123", "continue", "from", "here"],
      }),
    ).toEqual({
      sessionIdOrPath: "session-123",
      prompt: "continue from here",
    });
  });

  it("treats the first positional as prompt when --last is set", () => {
    expect(
      parseResumePositionalArgs({
        positional: ["continue", "from", "here"],
        last: true,
      }),
    ).toEqual({
      sessionIdOrPath: undefined,
      prompt: "continue from here",
    });
  });
});

describe("buildResumePrompt", () => {
  it("builds a prompt without extra user text", () => {
    expect(buildResumePrompt("/tmp/rollout.json")).toBe(
      "Resume this session: /tmp/rollout.json",
    );
  });

  it("includes follow-up instructions when provided", () => {
    expect(buildResumePrompt("/tmp/rollout.json", "fix the failing tests")).toBe(
      "Resume this session: /tmp/rollout.json\n\nAfter resuming, continue with this request:\nfix the failing tests",
    );
  });
});

describe("buildForkPrompt", () => {
  it("builds a fork prompt without extra user text", () => {
    expect(buildForkPrompt("/tmp/rollout.json")).toBe(
      "Fork this session into a new conversation: /tmp/rollout.json",
    );
  });

  it("includes follow-up instructions when provided", () => {
    expect(buildForkPrompt("/tmp/rollout.json", "try a different fix")).toBe(
      "Fork this session into a new conversation: /tmp/rollout.json\n\nIn the forked conversation, continue with this request:\ntry a different fix",
    );
  });
});
