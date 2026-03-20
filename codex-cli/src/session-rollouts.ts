import type { AppRollout } from "./app.js";

import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const SESSIONS_ROOT = path.join(os.homedir(), ".codex", "sessions");

export type SessionMeta = {
  path: string;
  timestamp: string;
  userMessages: number;
  toolCalls: number;
  firstMessage: string;
  sessionId: string;
};

export async function loadSessions(): Promise<Array<SessionMeta>> {
  try {
    const entries = await fsPromises.readdir(SESSIONS_ROOT);
    const sessions: Array<SessionMeta> = [];
    for (const entry of entries) {
      if (!entry.endsWith(".json")) {
        continue;
      }
      const filePath = path.join(SESSIONS_ROOT, entry);
      try {
        // eslint-disable-next-line no-await-in-loop
        const content = await fsPromises.readFile(filePath, "utf-8");
        const data = JSON.parse(content) as {
          session?: { timestamp?: string; id?: string };
          items?: Array<{
            type: string;
            role: string;
            content: Array<{ text: string }>;
          }>;
        };
        const items = Array.isArray(data.items) ? data.items : [];
        const firstUser = items.find(
          (i) => i?.type === "message" && i.role === "user",
        );
        const firstText =
          firstUser?.content?.[0]?.text?.replace(/\n/g, " ").slice(0, 16) ?? "";
        const userMessages = items.filter(
          (i) => i?.type === "message" && i.role === "user",
        ).length;
        const toolCalls = items.filter(
          (i) => i?.type === "function_call",
        ).length;
        sessions.push({
          path: filePath,
          timestamp: data.session?.timestamp || "",
          userMessages,
          toolCalls,
          firstMessage: firstText,
          sessionId: data.session?.id || path.basename(filePath, ".json"),
        });
      } catch {
        /* ignore invalid session */
      }
    }
    sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return sessions;
  } catch {
    return [];
  }
}

export function readRolloutFromFile(rolloutPath: string): AppRollout {
  const absolutePath = path.isAbsolute(rolloutPath)
    ? rolloutPath
    : path.join(process.cwd(), rolloutPath);
  const content = fs.readFileSync(absolutePath, "utf-8");
  return JSON.parse(content) as AppRollout;
}

export async function resolveSessionPath(options: {
  sessionIdOrPath?: string;
  last?: boolean;
}): Promise<string | undefined> {
  const sessions = await loadSessions();
  if (sessions.length === 0) {
    return undefined;
  }

  if (options.last) {
    return sessions[0]?.path;
  }

  const needle = options.sessionIdOrPath?.trim();
  if (!needle) {
    return undefined;
  }

  const absoluteNeedle = path.isAbsolute(needle)
    ? needle
    : path.join(process.cwd(), needle);

  const match = sessions.find((session) =>
    session.path === needle ||
    session.path === absoluteNeedle ||
    path.basename(session.path) === needle ||
    path.basename(session.path, ".json") === needle ||
    session.sessionId === needle
  );

  return match?.path;
}

export function buildResumePrompt(
  sessionPath: string,
  prompt?: string,
): string {
  const base = `Resume this session: ${sessionPath}`;
  const trimmedPrompt = prompt?.trim();
  if (!trimmedPrompt) {
    return base;
  }
  return `${base}\n\nAfter resuming, continue with this request:\n${trimmedPrompt}`;
}

export function buildForkPrompt(
  sessionPath: string,
  prompt?: string,
): string {
  const base = `Fork this session into a new conversation: ${sessionPath}`;
  const trimmedPrompt = prompt?.trim();
  if (!trimmedPrompt) {
    return base;
  }
  return `${base}\n\nIn the forked conversation, continue with this request:\n${trimmedPrompt}`;
}

export function parseResumePositionalArgs(options: {
  positional: Array<string>;
  last?: boolean;
}): {
  sessionIdOrPath?: string;
  prompt?: string;
} {
  if (options.last) {
    const prompt = options.positional.join(" ").trim();
    return {
      sessionIdOrPath: undefined,
      prompt: prompt || undefined,
    };
  }

  const [sessionIdOrPath, ...rest] = options.positional;
  const prompt = rest.join(" ").trim();
  return {
    sessionIdOrPath,
    prompt: prompt || undefined,
  };
}
