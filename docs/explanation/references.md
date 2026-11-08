# References

Specifications, documentation and publications the design relies on.

## Accessibility

- **W3C, Web Content Accessibility Guidelines (WCAG) 2.2.** <https://www.w3.org/TR/WCAG22/>. Cited for 1.4.1 Use of Color (amenity glyphs), 1.4.3 / 1.4.11 contrast, 2.1.1 Keyboard, 2.1.4 Character Key Shortcuts (canvas-scoped keys), 2.4.7 Focus Visible, 2.5.8 Target Size (handle hit areas), 3.2.2 On Input (the preset picker), and 4.1.3 Status Messages (the live region).
- **W3C, ARIA Authoring Practices Guide, Listbox Pattern.** <https://www.w3.org/WAI/ARIA/apg/patterns/listbox/>. The outline's keyboard model and `aria-activedescendant` focus.
- **W3C, ARIA Authoring Practices Guide, Toolbar Pattern.** <https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/>. The toolbar's roving tabindex.
- **W3C, WAI-ARIA 1.2**, the `application` role and `aria-roledescription`. <https://www.w3.org/TR/wai-aria-1.2/>.
- **MDN, `<dialog>`: The Dialog element.** <https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog>. Modal focus behaviour.

## Graphics and input

- **W3C, Scalable Vector Graphics (SVG) 2.** <https://www.w3.org/TR/SVG2/>. Transforms, `vector-effect: non-scaling-stroke`, patterns.
- **W3C, pointer input specification, Level 3.** <https://www.w3.org/TR/pointerevents3/>. Pointer capture and multi-pointer pinch.
- **MDN, `touch-action`.** <https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action>.
- **MDN, `content-visibility`.** <https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility>.
- **MDN Web Docs, the `passive` listener option.** Why the wheel handler is a non-passive property handler.

## Patterns

- **Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides: _Design Patterns: Elements of Reusable Object-Oriented Software_ (Addison-Wesley, 1994).** The Command pattern, which the invertible-operation history adapts to plain data.
- **React documentation, "Extracting State Logic into a Reducer."** <https://react.dev/learn/extracting-state-logic-into-a-reducer>.
- **George Marsaglia, "Xorshift RNGs", _Journal of Statistical Software_ 8(14), 2003.** The basis of the small deterministic generator used for the stress plan.

## Tooling

- **Vitest, Browser Mode.** <https://vitest.dev/guide/browser/>
- **Playwright, Browsers ("new headless" via `channel: 'chromium'`).** <https://playwright.dev/docs/browsers>
- **typescript-eslint, typed linting.** <https://typescript-eslint.io/getting-started/typed-linting/>
- **knip.** <https://knip.dev/>
- **Zod**, including `z.config({ jitless: true })`, which keeps it from probing for `eval` under a strict policy. <https://zod.dev/>
- **TSDoc.** <https://tsdoc.org/>. The comment syntax on every export.
- **eslint-plugin-jsdoc.** <https://github.com/gajus/eslint-plugin-jsdoc>. `jsdoc/require-jsdoc` enforces those comments.

## Security

- **W3C, Content Security Policy Level 3.** <https://www.w3.org/TR/CSP3/>. The policy, and why `frame-ancestors` is ignored in `<meta>`.
- **W3C, Trusted Types.** <https://www.w3.org/TR/trusted-types/>. `require-trusted-types-for 'script'` and `trusted-types 'none'`.
- **MDN, HTTP headers.** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers>. The headers in [ADR 0013](../adr/0013-security-headers-and-build-time-csp.md).
- **OWASP Application Security Verification Standard 5.0.0.** <https://owasp.org/www-project-application-security-verification-standard/>. Chapter-level mapping in [asvs-mapping.md](../security/asvs-mapping.md).
- **Microsoft, the STRIDE threat model.** <https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats>. Used per trust boundary in [threat-model.md](../security/threat-model.md).
- **OpenSSF Scorecard.** <https://github.com/ossf/scorecard>. The supply-chain checks in [supply-chain.md](../security/supply-chain.md).
- **CycloneDX.** <https://cyclonedx.org/>. The SBOM format CI writes.

## Documentation and project conventions

- **Diátaxis.** <https://diataxis.fr/>. How [docs/README.md](../README.md) is organised.
- **arc42.** <https://arc42.org/>. The outline of [architecture.md](architecture.md).
- **C4 model.** <https://c4model.com/>. Levels 1 to 3 of the architecture diagrams.
- **MADR 4.0.0.** <https://adr.github.io/madr/>. The decision record format.
- **Keep a Changelog 1.1.0.** <https://keepachangelog.com/en/1.1.0/>.
- **Semantic Versioning 2.0.0.** <https://semver.org/spec/v2.0.0.html>.
- **Conventional Commits 1.0.0.** <https://www.conventionalcommits.org/en/v1.0.0/>.
- **standard-readme.** <https://github.com/RichardLitt/standard-readme>. The order of the README's parts.
- **GitHub, community health files.** <https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file>.
