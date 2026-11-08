---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Test components in a real browser

## Context and Problem Statement

Simulated DOMs do not implement layout, pointer capture or `<dialog>` faithfully, and many editor bugs are layout or focus bugs. Where should component tests run?

## Decision Drivers

- Real focus, `<dialog>` and geometry.
- The real reducer, not mocks.
- One browser build for component and end-to-end tests.

## Considered Options

- A simulated DOM (jsdom or happy-dom) in Node.
- Vitest browser mode in Playwright-driven Chromium, plus Playwright end-to-end tests against the production build.

## Decision Outcome

Chosen option: "Vitest browser mode plus Playwright", because only a real browser shows focus, dialog and layout behaviour as users get it ([`vitest.config.ts`](../../vitest.config.ts), [`playwright.config.ts`](../../playwright.config.ts)). Both launch full Chromium in new headless mode (`channel: 'chromium'`): the slimmer headless shell does not render frames on some macOS versions, so clicks time out waiting for elements to be "stable".

### Consequences

- Good, because tests see what users see.
- Bad, because component tests take seconds rather than milliseconds, and CI must install Chromium.

### Confirmation

`tests/component` runs in Chromium on every `npm run verify`; the [test strategy](../testing/strategy.md) lists what it covers.

## Pros and Cons of the Options

### Simulated DOM

- Good, because it is fast.
- Bad, because pointer capture, layout and `<dialog>` are missing or approximate.

### Real browser

- Good, because behaviour matches what users get.
- Bad, because it is slower and needs a browser download.
