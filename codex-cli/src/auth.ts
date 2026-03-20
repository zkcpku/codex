import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const AUTH_DIR = path.join(os.homedir(), ".codex");
export const AUTH_FILE = path.join(AUTH_DIR, "auth.json");

export type StoredAuth = {
  tokens?: {
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
  };
  last_refresh?: string;
  OPENAI_API_KEY?: string;
};

export type AuthStatus = {
  exists: boolean;
  apiKeyPresent: boolean;
  refreshTokenPresent: boolean;
  expired: boolean;
  lastRefresh?: string;
};

export function readStoredAuth(): StoredAuth | undefined {
  try {
    if (!fs.existsSync(AUTH_FILE)) {
      return undefined;
    }
    return JSON.parse(fs.readFileSync(AUTH_FILE, "utf8")) as StoredAuth;
  } catch {
    return undefined;
  }
}

export function getAuthStatus(): AuthStatus {
  const data = readStoredAuth();
  if (!data) {
    return {
      exists: false,
      apiKeyPresent: false,
      refreshTokenPresent: false,
      expired: false,
    };
  }

  const lastRefreshTime = data.last_refresh
    ? new Date(data.last_refresh).getTime()
    : 0;
  const expired = Date.now() - lastRefreshTime > 28 * 24 * 60 * 60 * 1000;

  return {
    exists: true,
    apiKeyPresent: Boolean(data.OPENAI_API_KEY),
    refreshTokenPresent: Boolean(data.tokens?.refresh_token),
    expired,
    lastRefresh: data.last_refresh,
  };
}

export function removeStoredAuth(): boolean {
  try {
    if (!fs.existsSync(AUTH_FILE)) {
      return false;
    }
    fs.rmSync(AUTH_FILE, { force: true });
    return true;
  } catch {
    return false;
  }
}
