---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Enforce a strict Content Security Policy, checked by the tests

## Context and Problem Statement

A policy that exists only in documentation is never exercised. React's `style` props seem to need `'unsafe-inline'` styles, but React sets them through the CSSOM, which `style-src` does not govern. How do we make sure a strict policy really works?

## Decision Drivers

- No `'unsafe-inline'` and no `'unsafe-eval'`.
- A regression fails a test rather than surfacing in production.

## Considered Options

- A policy recommended in the documentation only.
- A served policy allowing `'unsafe-inline'` styles, to be safe with `style` props.
- The strict policy served by `vite preview`, so every end-to-end test runs under it, failing on console errors.

## Decision Outcome

Chosen option: "serve the strict policy from `vite preview`", because an untested policy drifts and the inline-style allowance is unnecessary.

- `vite preview` serves the build with the policy ([`vite.config.ts`](../../vite.config.ts)).
- `assetsInlineLimit: 0` keeps assets out of `data:` URLs, so fonts and images come from `'self'`.
- Zod runs `jitless` ([`document.ts`](../../src/core/document.ts)). Otherwise its first-use probe for `new Function` is reported as a violation, although Zod copes with the block.

### Consequences

- Good, because a regression is a failing test.
- Bad, because Zod uses its interpreted parser instead of compiled checks; validating the 3,000-item floor still takes about 10 ms.

### Confirmation

The end-to-end test "runs under the strict Content Security Policy without violations" in [`tests/e2e/site.spec.ts`](../../tests/e2e/site.spec.ts). Every end-to-end test also fails on a console error, where browsers report violations.

## Pros and Cons of the Options

### Documentation only

- Good, because it costs nothing.
- Bad, because nothing checks that the app runs under it.

### Policy with `'unsafe-inline'` styles

- Good, because no inline style can break.
- Bad, because it permits injected `<style>` and `style` attributes for no benefit.

### Strict policy in the test server

- Good, because every end-to-end test exercises it.
- Bad, because Zod gives up its compiled checks.

## More Information

[ADR 0013](0013-security-headers-and-build-time-csp.md) holds the full policy, the other security headers and the `<meta>` copy for static hosts.
