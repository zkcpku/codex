import { buildReviewPlan } from "../src/review-command.js";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/utils/get-diff.js", () => ({
  getGitDiff: vi.fn(() => ({
    isGitRepo: true,
    diff: "diff --git a/a.ts b/a.ts\n+const a = 1;\n",
  })),
}));

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn((cmd: string, args: Array<string>) => {
    if (cmd !== "git") {
      throw new Error("unexpected command");
    }
    if (args[0] === "merge-base") {
      return "abc123\n";
    }
    if (args[0] === "diff") {
      return "diff --git a/base.ts b/base.ts\n+const base = true;\n";
    }
    if (args[0] === "show") {
      return "commit deadbeef\n\ndiff --git a/c.ts b/c.ts\n+const c = 1;\n";
    }
    throw new Error(`unexpected args: ${args.join(" ")}`);
  }),
}));

describe("buildReviewPlan", () => {
  it("builds a review plan for uncommitted changes", () => {
    const plan = buildReviewPlan({ uncommitted: true });
    expect(plan.prompt).toContain("Review the current uncommitted changes.");
    expect(plan.prompt).toContain("diff --git a/a.ts b/a.ts");
  });

  it("builds a review plan for a base branch", () => {
    const plan = buildReviewPlan({ base: "main" });
    expect(plan.prompt).toContain("Review the changes against base branch main.");
    expect(plan.prompt).toContain("diff --git a/base.ts b/base.ts");
  });

  it("builds a review plan for a commit with title", () => {
    const plan = buildReviewPlan({
      commit: "deadbeef",
      title: "Add feature",
    });
    expect(plan.prompt).toContain(
      "Review the changes introduced by commit deadbeef.",
    );
    expect(plan.prompt).toContain("Commit title: Add feature.");
  });

  it("builds a review plan with custom instructions", () => {
    const plan = buildReviewPlan({ prompt: "Focus on security issues." });
    expect(plan.prompt).toContain(
      "Additional review instructions: Focus on security issues.",
    );
  });

  it("rejects conflicting review targets", () => {
    expect(() =>
      buildReviewPlan({ uncommitted: true, base: "main" })
    ).toThrow("Specify only one of --uncommitted, --base, or --commit");
  });
});
