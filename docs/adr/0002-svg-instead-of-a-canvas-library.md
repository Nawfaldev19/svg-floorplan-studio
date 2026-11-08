---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Render with SVG instead of a canvas library

## Context and Problem Statement

A floor plan holds tens to a few thousand items. How should they be drawn so the editor stays fast, accessible and themeable?

## Decision Drivers

- Focusable, labelled items in the viewer.
- Themes from the app's CSS custom properties.
- A few thousand items stay responsive.

## Considered Options

- HTML canvas, directly or through a scene-graph library.
- WebGL.
- Plain SVG with viewport culling.

## Decision Outcome

Chosen option: "plain SVG with viewport culling", because every item is a DOM node that can be focused, labelled and styled, and culling keeps the node count small when zoomed in.

### Consequences

- Good, because the viewer's items are labelled buttons, and screen readers, browser zoom and both themes work without a parallel accessibility tree.
- Good, because hit testing stays mathematical in the core ([`hitTest`](../../src/core/selection.ts)), independent of stacking order and DOM hit regions, and testable without a browser.
- Bad, because SVG does not scale to hundreds of thousands of visible nodes. Culling covers the intended size; canvas is the next step if plans grow a hundredfold.

### Confirmation

- The end-to-end test "renders only visible items on the 3,000-desk stress floor" checks that zooming in leaves fewer than 300 items in the DOM.
- `tests/unit/seed-storage-culling.test.ts` covers `visibleItems` and the bounds cache.

## Pros and Cons of the Options

### Canvas

- Good, because it draws very large scenes quickly.
- Bad, because without a DOM, focus, labels and hit regions are rebuilt by hand.

### WebGL

- Good, because it scales furthest.
- Bad, because it has canvas's accessibility gap and far more code.

### SVG

- Good, because items are real elements.
- Bad, because node count is the limit.

## More Information

"Rendering and performance" in [architecture](../explanation/architecture.md).
