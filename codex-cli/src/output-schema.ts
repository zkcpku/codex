import Ajv from "ajv";
import fs from "node:fs";

export type OutputSchemaValidator = {
  schemaPath: string;
  validateJsonText: (text: string | undefined) => void;
};

export function loadOutputSchemaValidator(
  schemaPath?: string,
): OutputSchemaValidator | undefined {
  if (!schemaPath) {
    return undefined;
  }

  let schemaText: string;
  try {
    schemaText = fs.readFileSync(schemaPath, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read output schema file ${schemaPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  let schemaJson: object;
  try {
    schemaJson = JSON.parse(schemaText) as object;
  } catch (error) {
    throw new Error(
      `Output schema file ${schemaPath} is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schemaJson);

  return {
    schemaPath,
    validateJsonText(text: string | undefined) {
      if (!text || text.trim() === "") {
        throw new Error(
          `No final assistant message was produced for output schema ${schemaPath}.`,
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        throw new Error(
          `Final assistant message is not valid JSON for output schema ${schemaPath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      if (!validate(parsed)) {
        const details = ajv.errorsText(validate.errors, { separator: "; " });
        throw new Error(
          `Final assistant message does not match output schema ${schemaPath}: ${details}`,
        );
      }
    },
  };
}
