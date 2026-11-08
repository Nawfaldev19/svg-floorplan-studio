---
status: accepted
date: 2026-10-17
decision-makers: Project maintainer
---

# Send security headers and embed the policy in the built page

## Context and Problem Statement

A Content Security Policy alone leaves MIME sniffing, referrer leakage, framing in older browsers, cross-origin window access and features such as the camera at browser defaults, and a host without header support would serve no policy at all. What should every response carry, and how does the policy reach such a host?

## Decision Drivers

- Defence in depth for a client-only app whose inputs are untrusted files and storage.
- Protection on hosts without header support.
- A test for every header; no runtime cost or new dependency.

## Considered Options

- CSP header only, other headers documented for deployers.
- Policy in a `<meta>` tag only.
- Headers on the Vite servers, plus the header-independent policy in the built `index.html` as `<meta>`.

## Decision Outcome

Chosen option: "headers plus a build-time `<meta>` policy", because only it protects on any host while still delivering `frame-ancestors` and the other headers where possible. All of it lives in [`vite.config.ts`](../../vite.config.ts).

Every response from `vite` and `vite preview` carries:

| Header                         | Value                                                          |
| ------------------------------ | -------------------------------------------------------------- |
| `X-Content-Type-Options`       | `nosniff`                                                      |
| `Referrer-Policy`              | `no-referrer`                                                  |
| `X-Frame-Options`              | `DENY`                                                         |
| `Cross-Origin-Opener-Policy`   | `same-origin`                                                  |
| `Cross-Origin-Resource-Policy` | `same-origin`                                                  |
| `Permissions-Policy`           | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |

`vite preview` also sends `Content-Security-Policy`:

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self';
font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none';
form-action 'none'; require-trusted-types-for 'script'; trusted-types 'none';
frame-ancestors 'none'
```

The app makes no requests after load (`connect-src 'none'`) and writes no HTML strings into the DOM (`trusted-types 'none'`).

The build-only plugin `floorplan-studio-csp-meta` writes the same policy, minus `frame-ancestors` (ignored in `<meta>`), into `index.html` as `<meta http-equiv="Content-Security-Policy">`. Its `transformIndexHtml` hook runs with `order: 'pre'` and inserts the tag right after `<meta charset>`, ahead of every script and style; the build fails if the charset tag is missing.

The development server sends the other headers but not the policy, because Vite injects inline styles and a WebSocket client for hot reload.

### Consequences

- Good, because a static deployment still enforces the policy.
- Good, because Trusted Types turn any future `innerHTML`-style injection into a blocked, visible error.
- Bad, because an HTML-string write on a path the tests miss would fail closed in production; `src/` has no `innerHTML`, `insertAdjacentHTML`, `document.write` or `dangerouslySetInnerHTML`.
- Neutral, because `X-Frame-Options` duplicates `frame-ancestors 'none'` for browsers older than CSP Level 2.

### Confirmation

- The end-to-end test "sends the security headers, and the built page carries the policy as well" checks every header, the `<meta>` policy (without `frame-ancestors`), that the `<meta>` is the second element in `<head>`, and `nosniff` on a script asset.
- "runs under the strict Content Security Policy without violations" checks that no request leaves the origin.
- Every end-to-end test fails on a console error, where Chromium reports policy and Trusted Types violations.

## Pros and Cons of the Options

### CSP header only

- Good, because no build step is involved.
- Bad, because static hosts serve no policy and other defaults stay permissive.

### `<meta>` only

- Good, because it works on every host.
- Bad, because `frame-ancestors` and the other headers cannot travel this way.

### Headers plus `<meta>` policy

- Good, because protection holds on any host.
- Bad, because the policy is delivered twice; both copies come from one constant, `CSP_DIRECTIVES`.

## More Information

Deployment: [deploy the static build](../how-to/deploy-the-static-build.md). Threats: [threat model](../security/threat-model.md). Why the policy is strict: [ADR 0012](0012-strict-content-security-policy.md).
