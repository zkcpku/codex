import type { AppRollout } from "../src/app.js";

import { applyPatchesFromRollout } from "../src/apply-command.js";
import { describe, expect, it, vi } from "vitest";

const { execApplyPatch } = vi.hoisted(() => ({
  execApplyPatch: vi.fn(),
}));

vi.mock("../src/utils/agent/exec.js", () => ({
  execApplyPatch,
}));

describe("applyPatchesFromRollout", () => {
  it("applies every apply_patch payload from a rollout", () => {
    execApplyPatch.mockReturnValue({ exitCode: 0, stdout: "Done!", stderr: "" });
    const rollout: AppRollout = {
      session: {
        id: "session-1",
        user: "tester",
        version: "0.0.0",
        model: "codex-mini-latest",
        timestamp: new Date().toISOString(),
        instructions: "",
      },
      items: [
        {
          id: "fc-1",
          type: "function_call",
          call_id: "call-1",
          name: "apply_patch",
          arguments: JSON.stringify({
            patch:
              "*** Begin Patch\n*** Add File: foo.txt\n+hello\n*** End Patch",
          }),
          status: "completed",
        },
        {
          id: "fc-2",
          type: "function_call",
          call_id: "call-2",
          name: "apply_patch",
          arguments: JSON.stringify({
            patch:
              "*** Begin Patch\n*** Add File: bar.txt\n+world\n*** End Patch",
          }),
          status: "completed",
        },
      ],
    };

    expect(applyPatchesFromRollout(rollout, "/tmp/project")).toEqual({
      applied: 2,
    });
    expect(execApplyPatch).toHaveBeenCalledTimes(2);
  });

  it("fails when no apply_patch payloads exist", () => {
    const rollout: AppRollout = {
      session: {
        id: "session-1",
        user: "tester",
        version: "0.0.0",
        model: "codex-mini-latest",
        timestamp: new Date().toISOString(),
        instructions: "",
      },
      items: [],
    };

    expect(() => applyPatchesFromRollout(rollout)).toThrow(
      "No apply_patch tool calls were found",
    );
  });
});
