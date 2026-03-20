import {
  shouldConfirmOutsideGitRepo,
  shouldPersistRollout,
} from "../src/runtime-flags.js";
import { describe, expect, it } from "vitest";

describe("shouldConfirmOutsideGitRepo", () => {
  it("requires confirmation outside git by default", () => {
    expect(
      shouldConfirmOutsideGitRepo({
        inGitRepo: false,
        accepted: false,
        skipGitRepoCheck: false,
      }),
    ).toBe(true);
  });

  it("skips confirmation when the flag is enabled", () => {
    expect(
      shouldConfirmOutsideGitRepo({
        inGitRepo: false,
        accepted: false,
        skipGitRepoCheck: true,
      }),
    ).toBe(false);
  });
});

describe("shouldPersistRollout", () => {
  it("disables rollout persistence in ephemeral mode", () => {
    expect(shouldPersistRollout(true)).toBe(false);
  });

  it("keeps rollout persistence enabled by default", () => {
    expect(shouldPersistRollout(false)).toBe(true);
  });
});
