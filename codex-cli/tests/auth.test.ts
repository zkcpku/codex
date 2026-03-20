import { getAuthStatus, readStoredAuth, removeStoredAuth } from "../src/auth.js";
import { afterEach, describe, expect, it, vi } from "vitest";

const { existsSync, readFileSync, rmSync } = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  rmSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync,
    readFileSync,
    rmSync,
  },
}));

describe("auth helpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns undefined when auth file is missing", () => {
    existsSync.mockReturnValue(false);
    expect(readStoredAuth()).toBeUndefined();
  });

  it("reports signed-in auth status from stored auth file", () => {
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(
      JSON.stringify({
        OPENAI_API_KEY: "sk-test",
        last_refresh: new Date().toISOString(),
        tokens: { refresh_token: "refresh-token" },
      }),
    );

    expect(getAuthStatus()).toMatchObject({
      exists: true,
      apiKeyPresent: true,
      refreshTokenPresent: true,
      expired: false,
    });
  });

  it("removes the auth file when present", () => {
    existsSync.mockReturnValue(true);
    expect(removeStoredAuth()).toBe(true);
    expect(rmSync).toHaveBeenCalled();
  });
});
