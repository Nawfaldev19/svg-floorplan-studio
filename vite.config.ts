import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Content Security Policy directives that work in a `<meta>` tag as well as a
 * header. The app needs no 'unsafe-inline': React applies `style` props through
 * the CSSOM, which style-src does not govern, and no asset is inlined as a
 * data: URL (see assetsInlineLimit). It makes no network requests after load,
 * so connect-src is 'none', and no code writes HTML strings into the DOM, so
 * Trusted Types are required with no policy allowed. See
 * docs/adr/0012-strict-content-security-policy.md and
 * docs/adr/0013-security-headers-and-build-time-csp.md.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
];

/** The full policy for the HTTP header. `frame-ancestors` only works there, not in `<meta>`. */
const CONTENT_SECURITY_POLICY = [...CSP_DIRECTIVES, "frame-ancestors 'none'"].join('; ');

/**
 * Headers for every response. The development server cannot use the CSP,
 * because Vite injects inline styles and a WebSocket client for hot reload.
 */
const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

const CHARSET_META = '<meta charset="UTF-8" />';

/**
 * Puts the policy into the built index.html as well, so a static host that
 * cannot set headers still enforces it. It goes straight after the charset
 * declaration, which must come first, and before every script and style.
 * Build only: in development it would block Vite's inline styles.
 */
function contentSecurityPolicyMeta(): Plugin {
  return {
    name: 'floorplan-studio-csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes(CHARSET_META)) throw new Error('index.html lost its charset meta');
        const policy = `<meta http-equiv="Content-Security-Policy" content="${CSP_DIRECTIVES.join('; ')}" />`;
        return html.replace(CHARSET_META, `${CHARSET_META}\n    ${policy}`);
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicyMeta()],
  server: { port: 5173, strictPort: true, headers: BASE_HEADERS },
  preview: {
    port: 4173,
    strictPort: true,
    headers: { ...BASE_HEADERS, 'Content-Security-Policy': CONTENT_SECURITY_POLICY },
  },
  // Source maps are written for debugging but not linked from the bundle, so
  // browsers do not fetch them; a host can leave them out of the deployment.
  build: { sourcemap: 'hidden', assetsInlineLimit: 0 },
});
