import { buildResumePrompt, parseResumePositionalArgs } from "./session-rollouts.js";

export function parseExecPrompt(positional: Array<string>): string | undefined {
  const prompt = positional.join(" ").trim();
  return prompt || undefined;
}

export function buildExecResumePrompt(options: {
  positional: Array<string>;
  last?: boolean;
  sessionPath: string;
}): string {
  const parsed = parseResumePositionalArgs({
    positional: options.positional,
    last: options.last,
  });
  return buildResumePrompt(options.sessionPath, parsed.prompt);
}
