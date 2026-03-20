import type { AppRollout } from "./app.js";

import { extractAppliedPatchTexts } from "./utils/extract-applied-patches.js";
import { execApplyPatch } from "./utils/agent/exec.js";

export function applyPatchesFromRollout(
  rollout: AppRollout,
  workdir?: string,
): { applied: number } {
  const patches = extractAppliedPatchTexts(rollout.items);
  if (patches.length === 0) {
    throw new Error("No apply_patch tool calls were found in the selected session.");
  }

  for (const patch of patches) {
    const result = execApplyPatch(patch, workdir);
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || "Failed to apply patch.");
    }
  }

  return { applied: patches.length };
}
