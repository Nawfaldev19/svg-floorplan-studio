# Scope

## Goal

A space manager lays out a co-working floor in the browser (desks, meeting rooms, lounges, planters, walls), tags items with amenities and shares a read-only view in which members can highlight, say, every standing desk. Everything the mouse can do, the keyboard can do too.

## In scope

Editing with snapping, grouping and arranging; undo and redo with one step per gesture; amenity tagging by brush or checkbox; pan and zoom by mouse, trackpad, keyboard and touch; autosave, validated JSON import and export with a version migration, and presets; the read-only viewer as a reusable component; light and dark themes, a responsive layout and WCAG 2.2 AA as the accessibility target. Each is an entry in the [feature catalogue](../reference/features.md). Technical constraints are in [architecture.md](architecture.md#2-constraints).

## Non-goals

- Accounts, sharing, servers and real-time collaboration.
- Free-form shapes, wall joins and measurements.
- Resizing a multi-selection as a whole (it rotates in steps as one shape).
- Telemetry, analytics or any network call after the page has loaded.

## Definition of done

- `npm run verify` passes; its steps are listed under [Deployment and CI](architecture.md#6-deployment-and-ci).
- Every README feature has a catalogue entry with at least one linked test ([traceability](../testing/traceability.md)).
- Every README claim links to the code or document that shows it.
- The source has no TODOs, stub text or console output.
- Every relative link in the Markdown documentation resolves.
