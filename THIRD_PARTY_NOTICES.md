# Third-party notices

Floorplan Studio's own code is MIT-licensed (see `LICENSE`). It depends on the open-source packages below. Versions are the ones in `package-lock.json` at the time of writing.

## Shipped in the built app

| Package                                  | Version | Licence                             | Use                             |
| ---------------------------------------- | ------- | ----------------------------------- | ------------------------------- |
| react, react-dom                         | 19.3.1  | MIT                                 | UI rendering                    |
| zod                                      | 4.6.7   | MIT                                 | Import validation               |
| lucide-react                             | 1.58.0  | ISC                                 | Icons                           |
| @fontsource-variable/bricolage-grotesque | 5.3.0   | SIL OFL 1.1 (font), MIT (packaging) | Display typeface, self-hosted   |
| @fontsource/atkinson-hyperlegible        | 5.3.0   | SIL OFL 1.1 (font), MIT (packaging) | Body typeface, self-hosted      |
| @fontsource-variable/jetbrains-mono      | 5.3.0   | SIL OFL 1.1 (font), MIT (packaging) | Monospace typeface, self-hosted |

## Development only (not shipped)

| Package                                                                  | Version       | Licence      |
| ------------------------------------------------------------------------ | ------------- | ------------ |
| typescript                                                               | 6.0.3         | Apache-2.0   |
| vite                                                                     | 8.3.4         | MIT          |
| @vitejs/plugin-react                                                     | 6.1.2         | MIT          |
| vitest, @vitest/browser, @vitest/browser-playwright, @vitest/coverage-v8 | 5.0.5         | MIT          |
| vitest-browser-react                                                     | 2.3.0         | MIT          |
| playwright, @playwright/test                                             | 1.64.1        | Apache-2.0   |
| eslint                                                                   | 10.13.0       | MIT          |
| @eslint/js                                                               | 10.0.1        | MIT          |
| typescript-eslint                                                        | 8.71.2        | MIT          |
| eslint-plugin-react-hooks                                                | 7.1.1         | MIT          |
| eslint-plugin-react-refresh                                              | 0.5.7         | MIT          |
| eslint-plugin-jsdoc                                                      | 65.0.2        | BSD-3-Clause |
| globals                                                                  | 17.13.0       | MIT          |
| prettier                                                                 | 3.9.10        | MIT          |
| knip                                                                     | 6.41.0        | ISC          |
| @types/react, @types/react-dom, @types/node                              | 19.3.x / 24.x | MIT          |

### Transitive development dependencies with other licences

An audit of every package in `package-lock.json` (2026-10-17) found only MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD and SIL OFL 1.1, with these exceptions. All are pulled in by build or lint tools and none is included in the built app.

| Package                          | Licence       | Pulled in by                                                      | Note                                                                                                                  |
| -------------------------------- | ------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| lightningcss (+ platform binary) | MPL-2.0       | vite                                                              | CSS minifier used at build time. MPL-2.0 is file-level copyleft; it only applies to modified copies of its own files. |
| caniuse-lite                     | CC-BY-4.0     | browserslist (via the React Hooks lint plugin's Babel dependency) | Browser-support data used by tooling.                                                                                 |
| minimatch                        | BlueOak-1.0.0 | ESLint and others                                                 | A permissive licence.                                                                                                 |
| spdx-exceptions                  | CC-BY-3.0     | eslint-plugin-jsdoc (via spdx-expression-parse)                   | A data list of SPDX licence exceptions, used by a lint rule.                                                          |
| spdx-license-ids                 | CC0-1.0       | eslint-plugin-jsdoc (via spdx-expression-parse)                   | A public-domain data list of SPDX licence identifiers.                                                                |

## Fonts

All three typefaces are under the SIL Open Font License 1.1 (<https://openfontlicense.org>). They are bundled from the Fontsource packages and served from the app's own origin. No requests go to font CDNs.

## Icons

Lucide icons are under the ISC licence (<https://lucide.dev/license>). The app logo and favicon are original SVG.
