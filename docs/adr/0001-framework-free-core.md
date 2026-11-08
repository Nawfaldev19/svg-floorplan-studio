---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Keep all editor logic in a framework-free core

## Context and Problem Statement

An editor gathers subtle rules: group expansion, ID allocation, whether a brush stroke adds or removes a tag, which groups dissolve after a delete. Inside components they can only be tested by rendering and simulating input. Where should they live?

## Decision Drivers

- Fast, deterministic tests without a browser.
- Independence from a UI framework's lifecycle.
- Reuse from another UI or a script.

## Considered Options

- Rules in React components and hooks.
- A state-management library (store, reducers, middleware).
- A framework-free core: pure functions and one reducer in `src/core`.

## Decision Outcome

Chosen option: "a framework-free core", because it gives the fastest, most precise tests and keeps the UI thin: components turn input into [`editorReducer`](../../src/core/editor.ts) actions and render state.

### Consequences

- Good, because the unit suite runs in Node in seconds, and a script such as a bulk importer could reuse the core.
- Bad, because gesture code must be handed the selection and viewport rather than reading them from context.

### Confirmation

- ESLint's `no-restricted-imports` ([`eslint.config.js`](../../eslint.config.js)) fails `npm run lint` if `src/core` imports React or a UI folder.
- `vitest.config.ts` enforces coverage thresholds on `src/core/**` (see the [test strategy](../testing/strategy.md)).

## Pros and Cons of the Options

### Rules in components

- Good, because there is less indirection.
- Bad, because every rule needs a rendered component to test.

### A state-management library

- Good, because of devtools and middleware.
- Bad, because it is a dependency whose API the rules would follow, while a plain reducer is already one testable transition function.

### Framework-free core

- Good, because rules are plain data in, plain data out.
- Bad, because state is passed explicitly.

## More Information

Building blocks: [architecture](../explanation/architecture.md). Folder dependency rules: [project structure](../reference/project-structure.md).
