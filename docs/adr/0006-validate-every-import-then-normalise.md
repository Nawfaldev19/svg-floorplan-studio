---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Validate every import, then normalise

## Context and Problem Statement

Imported JSON may be malformed, from a newer version, hand-edited or hostile, and the plan saved in `localStorage` can be edited too. How should the app turn untrusted text into a plan?

## Decision Drivers

- A bad file never partly replaces the current plan.
- Errors give a path, so a person can fix the file.
- One validator for every way in.

## Considered Options

- `JSON.parse` and type assertions, with ad hoc checks.
- A JSON Schema validator.
- A Zod schema with bounds, then cross-field checks and normalisation.

## Decision Outcome

Chosen option: "Zod schema, then cross-field checks and normalisation", because the schema is TypeScript, so the validated type cannot disagree with the model, and Zod's issue paths make readable errors. [`parseDocument`](../../src/core/document.ts):

1. parses against a schema that drops unknown keys and enforces the bounds in [`limits.ts`](../../src/core/limits.ts);
2. checks cross-field rules: unique IDs, no group ID equal to an item ID, group references that resolve;
3. normalises gently (sizes up to the kind minimum, rotation wrapped, duplicate tags removed, lone groups dissolved), with a note for each change;
4. on failure, lists the first eight errors and a count, and leaves the current plan untouched.

Files over 8 MB are refused from `File.size` before reading ([`checkImportSize`](../../src/core/document.ts)). Every bound is listed in the [file format](../reference/file-format.md).

### Consequences

- Good, because the same function guards autosave loading, so a corrupt `localStorage` entry cannot crash the app.
- Good, because unknown keys, `__proto__` included, never reach the model.
- Bad, because the schema must evolve with the model; the version field and migration function make that explicit.

### Confirmation

- [`tests/unit/document.test.ts`](../../tests/unit/document.test.ts) covers each rejection rule, the error cap, dropped unknown keys, migration and notes.
- End-to-end test "rejects an invalid import and leaves the plan untouched" in [`tests/e2e/editor.spec.ts`](../../tests/e2e/editor.spec.ts).

## Pros and Cons of the Options

### Ad hoc checks

- Good, because there is no dependency.
- Bad, because checks drift from the types and are easy to forget.

### JSON Schema

- Good, because it is language-neutral.
- Bad, because the TypeScript type is kept separately or generated.

### Zod

- Good, because one definition gives parser, type and error paths.
- Bad, because Zod (MIT) ships in the bundle.

## More Information

Migrated version 1 files are validated again against version 2 ([ADR 0014](0014-validate-migrated-files-against-current-schema.md)).
