import {
  buildExecResumePrompt,
  parseExecPrompt,
} from "../src/exec-command.js";
import { describe, expect, it } from "vitest";

describe("parseExecPrompt", () => {
  it("parses plain exec prompts", () => {
    expect(parseExecPrompt(["fix", "the", "tests"])).toBe("fix the tests");
  });

  it("returns undefined for empty exec prompt", () => {
    expect(parseExecPrompt([])).toBeUndefined();
  });
});

describe("buildExecResumePrompt", () => {
  it("builds an exec resume prompt for a specific session", () => {
    expect(
      buildExecResumePrompt({
        positional: ["session-123", "continue", "from", "here"],
        sessionPath: "/tmp/rollout.json",
      }),
    ).toBe(
      "Resume this session: /tmp/rollout.json\n\nAfter resuming, continue with this request:\ncontinue from here",
    );
  });

  it("treats positional text as prompt when --last is set", () => {
    expect(
      buildExecResumePrompt({
        positional: ["continue", "from", "latest"],
        last: true,
        sessionPath: "/tmp/rollout.json",
      }),
    ).toBe(
      "Resume this session: /tmp/rollout.json\n\nAfter resuming, continue with this request:\ncontinue from latest",
    );
  });
});
