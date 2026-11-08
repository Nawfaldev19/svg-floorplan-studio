# Documentation

Organised with [Diátaxis](https://diataxis.fr): tutorials to learn, how-to guides for tasks, reference to look things up, explanation for the reasons.

## Tutorials

- [Getting started](tutorials/getting-started.md): from clone to editing, tagging and viewing a plan, with expected results at each step.

## How-to guides

- [Run the tests](how-to/run-the-tests.md)
- [Audit accessibility with axe-core](how-to/audit-accessibility.md)
- [Reset the demo data](how-to/reset-demo-data.md)
- [Add an item kind](how-to/add-an-item-kind.md)
- [Deploy the static build](how-to/deploy-the-static-build.md) (with the security headers)
- [Recapture the screenshots](how-to/recapture-screenshots.md)
- [Report a vulnerability](how-to/report-a-vulnerability.md)
- [Enable repository security features](how-to/enable-repository-security-features.md) (maintainer checklist)

## Reference

- [Feature catalogue](reference/features.md): every feature, with code, tests, decisions and accessibility notes
- [Keyboard and pointer](reference/keyboard.md): checked against `KEYMAP` by a unit test
- [Design tokens and components](reference/design-tokens.md): every token, contrast ratios in both themes, and the component inventory
- [Plan file format](reference/file-format.md)
- [Configuration](reference/configuration.md): ports, headers, test settings, constants
- [Project structure](reference/project-structure.md): folders and the dependency rules between them
- [Glossary](reference/glossary.md)

## Explanation

- [Architecture](explanation/architecture.md): goals, constraints, C4 diagrams, runtime flows, cross-cutting concepts, risks
- [Geometry, history and input handling](explanation/geometry-and-history.md)
- [Scope](explanation/scope.md): goals, non-goals, acceptance criteria
- [References](explanation/references.md): specifications and documentation relied on
- [Architecture decision records](adr/README.md)

## Security

- [Threat model](security/threat-model.md): trust boundaries, STRIDE, abuse cases
- [OWASP ASVS 5.0.0 mapping](security/asvs-mapping.md)
- [Supply chain](security/supply-chain.md): dependency policy, CI controls, audit status
- Policy and reporting: [SECURITY.md](../SECURITY.md)

## Testing

- [Strategy](testing/strategy.md): levels, tools, counts, coverage, determinism, gaps (the one place for test counts)
- [Traceability](testing/traceability.md): features and threats mapped to tests

## Project

[README](../README.md) · [CHANGELOG](../CHANGELOG.md) · [CONTRIBUTING](../CONTRIBUTING.md) · [ACCESSIBILITY](../ACCESSIBILITY.md) · [SUPPORT](../SUPPORT.md) · [CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md) · [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md)

## Conventions

| Area                     | Standard followed                                                                                                                                                  | Where                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Documentation structure  | [Diátaxis](https://diataxis.fr)                                                                                                                                    | This page                                        |
| Architecture description | [arc42](https://arc42.org) (reduced) and the [C4 model](https://c4model.com) levels 1–3 in Mermaid                                                                 | [architecture.md](explanation/architecture.md)   |
| Decisions                | [MADR 4.0.0](https://adr.github.io/madr/)                                                                                                                          | [adr/](adr/README.md)                            |
| Changelog and versions   | [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html), ISO 8601 dates                   | [CHANGELOG.md](../CHANGELOG.md)                  |
| Commit messages          | [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)                                                                                       | [CONTRIBUTING.md](../CONTRIBUTING.md)            |
| README                   | [standard-readme](https://github.com/RichardLitt/standard-readme) order                                                                                            | [README.md](../README.md)                        |
| Security requirements    | [OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/), chapter level                                                       | [asvs-mapping.md](security/asvs-mapping.md)      |
| Threat modelling         | STRIDE per trust boundary, with a data-flow diagram                                                                                                                | [threat-model.md](security/threat-model.md)      |
| Supply chain             | [OpenSSF Scorecard](https://github.com/ossf/scorecard) checks                                                                                                      | [supply-chain.md](security/supply-chain.md)      |
| Accessibility            | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA as the target; [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) for widgets                     | [ACCESSIBILITY.md](../ACCESSIBILITY.md)          |
| In-code documentation    | [TSDoc](https://tsdoc.org), presence enforced by `eslint-plugin-jsdoc`                                                                                             | [CONTRIBUTING.md](../CONTRIBUTING.md#code-style) |
| Community health         | [GitHub community health files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) | Root files and [`.github/`](../.github/)         |

Terms are defined in the [glossary](reference/glossary.md).
