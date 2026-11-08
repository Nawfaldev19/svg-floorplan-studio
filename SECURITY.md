# Security policy

Floorplan Studio is a client-only demo project maintained on a best-effort basis by one person. Reports are welcome and taken seriously.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.0.x   | Yes       |

## Reporting a vulnerability

Please **do not** open a public issue. Use the repository's **Security → Report a vulnerability** form ([private vulnerability reporting](../../security/advisories/new)).

Include what the problem is and what an attacker could achieve; the version or commit, browser and operating system; steps to reproduce, ideally with a minimal plan file (`.floorplan-studio.json`) or stored value; and whether and how you want to be credited.

## What to expect

These are goals for a personal project, not commitments: acknowledgement within **5 working days**, an assessment (confirmed or not, severity, plan) within **10 working days**, and a fix and disclosure coordinated with you. A GitHub security advisory is published with the fix, crediting you if you wish.

## Scope

In scope: the editor, the viewer, the plan importer and storage handling; the headers and Content Security Policy in `vite.config.ts`; the workflows in `.github/workflows/`.

Out of scope:

- your own hosting (missing headers or HTTPS); see [deploy-the-static-build.md](docs/how-to/deploy-the-static-build.md);
- someone with access to your browser profile reading or changing `localStorage` (plans are stored unencrypted; keep secrets out of plan names);
- slow processing of a file within the documented limits (8 MB, 10,000 items) on a slow device;
- dependency vulnerabilities that do not affect Floorplan Studio (report them upstream), and tool findings without a demonstrated impact.

## Safe harbour

Good-faith research that follows this policy, avoids harming other people's data and allows reasonable time for a fix before disclosure is welcome, and no complaint will be made about it.

The [threat model](docs/security/threat-model.md) lists the trust boundaries and the control for each threat.
