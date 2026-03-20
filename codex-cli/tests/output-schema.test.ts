import { loadOutputSchemaValidator } from "../src/output-schema.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempFiles: Array<string> = [];

describe("loadOutputSchemaValidator", () => {
  afterEach(() => {
    for (const file of tempFiles.splice(0)) {
      try {
        fs.rmSync(file, { force: true });
      } catch {
        // ignore cleanup errors in tests
      }
    }
  });

  it("returns undefined when no schema path is provided", () => {
    expect(loadOutputSchemaValidator()).toBeUndefined();
  });

  it("validates matching JSON output", () => {
    const schemaPath = writeTempSchema({
      type: "object",
      properties: { result: { type: "string" } },
      required: ["result"],
      additionalProperties: false,
    });

    const validator = loadOutputSchemaValidator(schemaPath);
    expect(() =>
      validator?.validateJsonText('{"result":"ok"}')
    ).not.toThrow();
  });

  it("rejects non-JSON final output", () => {
    const schemaPath = writeTempSchema({
      type: "object",
      properties: { result: { type: "string" } },
      required: ["result"],
    });

    const validator = loadOutputSchemaValidator(schemaPath);
    expect(() => validator?.validateJsonText("not json")).toThrow(
      "Final assistant message is not valid JSON",
    );
  });

  it("rejects JSON that does not match the schema", () => {
    const schemaPath = writeTempSchema({
      type: "object",
      properties: { result: { type: "string" } },
      required: ["result"],
      additionalProperties: false,
    });

    const validator = loadOutputSchemaValidator(schemaPath);
    expect(() => validator?.validateJsonText('{"wrong":true}')).toThrow(
      "does not match output schema",
    );
  });
});

function writeTempSchema(schema: object): string {
  const filePath = path.join(
    os.tmpdir(),
    `codex-output-schema-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );
  fs.writeFileSync(filePath, JSON.stringify(schema), "utf8");
  tempFiles.push(filePath);
  return filePath;
}
