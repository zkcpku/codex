import { getGitDiff } from "./utils/get-diff.js";
import { execFileSync } from "node:child_process";

export type ReviewCommandArgs = {
  uncommitted?: boolean;
  base?: string;
  commit?: string;
  title?: string;
  prompt?: string;
};

type ReviewPlan = {
  diff: string;
  prompt: string;
};

export function buildReviewPlan(args: ReviewCommandArgs): ReviewPlan {
  const prompt = args.prompt?.trim();
  const targetCount = Number(Boolean(args.uncommitted)) +
    Number(Boolean(args.base)) +
    Number(Boolean(args.commit));

  if (targetCount > 1) {
    throw new Error(
      "Specify only one of --uncommitted, --base, or --commit for review.",
    );
  }

  if (prompt && targetCount > 0) {
    throw new Error(
      "Custom review instructions cannot be combined with --uncommitted, --base, or --commit.",
    );
  }

  const target = args.uncommitted
    ? "uncommitted"
    : args.base
      ? "base"
      : args.commit
        ? "commit"
        : prompt
          ? "custom"
          : undefined;

  if (!target) {
    throw new Error(
      "Specify --uncommitted, --base, --commit, or provide custom review instructions.",
    );
  }

  const diff = getReviewDiff(args);
  if (!diff.trim()) {
    throw new Error("No changes found to review.");
  }

  let reviewPrompt = [
    "You are performing a code review of a git diff.",
    "Focus on bugs, regressions, behavioral risks, and missing tests.",
    "List findings first, ordered by severity, with file paths and line references when possible.",
    "Keep any summary brief and only after the findings.",
  ].join(" ");

  if (target === "uncommitted") {
    reviewPrompt += " Review the current uncommitted changes.";
  } else if (target === "base") {
    reviewPrompt += ` Review the changes against base branch ${args.base}.`;
  } else if (target === "commit") {
    reviewPrompt += ` Review the changes introduced by commit ${args.commit}.`;
    if (args.title) {
      reviewPrompt += ` Commit title: ${args.title}.`;
    }
  } else if (prompt) {
    reviewPrompt += ` Additional review instructions: ${prompt}`;
  }

  reviewPrompt += `\n\nReview this diff:\n\n\`\`\`diff\n${diff}\n\`\`\`\n`;
  return { diff, prompt: reviewPrompt };
}

function getReviewDiff(args: ReviewCommandArgs): string {
  if (args.uncommitted) {
    const result = getGitDiff();
    if (!result.isGitRepo) {
      throw new Error("Current directory is not inside a git repository.");
    }
    return result.diff;
  }

  if (args.base) {
    const mergeBase = execFileSync("git", ["merge-base", args.base, "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return execFileSync("git", ["diff", "--color", `${mergeBase}..HEAD`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  if (args.commit) {
    return execFileSync(
      "git",
      ["show", "--color", "--format=medium", args.commit],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 10 * 1024 * 1024,
      },
    );
  }

  // For custom review instructions, default to reviewing the current working tree.
  const result = getGitDiff();
  if (!result.isGitRepo) {
    throw new Error("Current directory is not inside a git repository.");
  }
  return result.diff;
}
