# Architecture decision records

Each decision is one file in [MADR 4.0.0](https://adr.github.io/madr/) format: YAML front matter (`status`, `date`, `decision-makers`), then Context and Problem Statement, Decision Drivers, Considered Options, Decision Outcome (with Consequences and Confirmation), Pros and Cons of the Options, and More Information. Numbers are stable; a changed decision gets a new record that supersedes the old one.

| ADR                                                              | Decision                                                                          | Status   | Date       |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------- | ---------- |
| [0001](0001-framework-free-core.md)                              | Keep all editor logic in a framework-free core                                    | Accepted | 2026-10-17 |
| [0002](0002-svg-instead-of-a-canvas-library.md)                  | Render with SVG instead of a canvas library                                       | Accepted | 2026-10-17 |
| [0003](0003-history-as-invertible-operations.md)                 | Build history from invertible operations                                          | Accepted | 2026-10-17 |
| [0004](0004-preview-gestures-outside-the-document.md)            | Preview pointer gestures outside the document                                     | Accepted | 2026-10-17 |
| [0005](0005-centre-anchored-items-and-degrees.md)                | Anchor items at their centre and store rotation in degrees                        | Accepted | 2026-10-17 |
| [0006](0006-validate-every-import-then-normalise.md)             | Validate every import, then normalise                                             | Accepted | 2026-10-17 |
| [0007](0007-test-components-in-a-real-browser.md)                | Test components in a real browser                                                 | Accepted | 2026-10-17 |
| [0008](0008-listbox-and-inspector-as-keyboard-alternative.md)    | Offer a listbox plus inspector as the keyboard alternative                        | Accepted | 2026-10-17 |
| [0009](0009-editor-enforces-file-format-limits.md)               | Make the editor enforce the file format's limits                                  | Accepted | 2026-10-17 |
| [0010](0010-one-keymap-with-canvas-scoped-keys.md)               | Keep one keymap table, with keys scoped to where focus is                         | Accepted | 2026-10-17 |
| [0011](0011-multi-selection-rotates-about-its-centre.md)         | Rotate a multi-selection about the mean of its centres                            | Accepted | 2026-10-17 |
| [0012](0012-strict-content-security-policy.md)                   | Enforce a strict Content Security Policy, checked by the tests                    | Accepted | 2026-10-17 |
| [0013](0013-security-headers-and-build-time-csp.md)              | Send security headers and embed the policy in the built page                      | Accepted | 2026-10-17 |
| [0014](0014-validate-migrated-files-against-current-schema.md)   | Validate migrated files against the current schema                                | Accepted | 2026-10-17 |
| [0015](0015-responsive-editor-with-drawers-and-overflow-menu.md) | Make the editor responsive with drawers, an overflow menu and touch-sized targets | Accepted | 2026-10-17 |

To add one, use the next free number and a short kebab-case title, add a line here, and link the record from the code (`@see`) and from the feature catalogue entry it affects.
