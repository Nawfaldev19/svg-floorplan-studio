# Deploy the static build

1. Build: `npm ci && npm run build`. The output is `dist/`: `index.html`, hashed JavaScript and CSS, fonts, source maps and the favicon.
2. Serve `dist/` from any static host over HTTPS. Routing uses the URL hash (`#/editor`), so no rewrite rules are needed.
3. Send these response headers on every file. They are the ones `vite preview` sends and the end-to-end tests check ([`vite.config.ts`](../../vite.config.ts)):

   ```text
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; require-trusted-types-for 'script'; trusted-types 'none'; frame-ancestors 'none'
   X-Content-Type-Options: nosniff
   Referrer-Policy: no-referrer
   X-Frame-Options: DENY
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Resource-Policy: same-origin
   Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
   Strict-Transport-Security: max-age=31536000
   ```

   `Strict-Transport-Security` is not sent by the local preview (it runs on plain HTTP); add it on an HTTPS host.

4. If the host cannot send headers, the built `index.html` still carries the policy in a `<meta http-equiv="Content-Security-Policy">` tag, minus `frame-ancestors`, which browsers ignore there. The app can then be framed by other sites; prefer a host that sends headers.

## Why the policy needs no exceptions

- **No `'unsafe-inline'`.** React applies `style` props through the CSSOM, which `style-src` does not govern. The build inlines no assets as `data:` URLs (`assetsInlineLimit: 0`).
- **No `'unsafe-eval'`.** Zod is set to `jitless`, so it never tries `new Function`.
- **`connect-src 'none'`.** The app makes no requests after load; fonts are self-hosted.
- **Trusted Types.** No code writes HTML strings into the DOM, so no policy is allowed at all.
- **`frame-ancestors 'none'`.** "Embeddable" means that `PlanViewer` is a React component another app can render, not that this site should be framed. To show the viewer page in an iframe on your own site, replace `'none'` with that site's origin and drop `X-Frame-Options`.

Decisions: [ADR 0012](../adr/0012-strict-content-security-policy.md), [ADR 0013](../adr/0013-security-headers-and-build-time-csp.md).
